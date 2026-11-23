"""Daily Cost Management cache API for the Project 2 Azure Workbook.

Data flow:
  Cost Management Query API (resource-group scope, once per UTC day)
      -> private Azure Blob cache
      -> GET /api/cost-analytics (read-only workbook endpoint)

A Function-key protected POST /api/cost-cache-refresh primes the cache on demand.
The timer refresh runs daily at 02:30 UTC. 429 responses respect Cost Management's
QPU retry-after headers; a failed refresh never overwrites the last good cache.
"""
from __future__ import annotations

import json
import logging
import os
import time
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import azure.functions as func
from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, ContentSettings

_LOG = logging.getLogger("project2.cost_cache")
_API_VERSION = "2025-03-01"
_CACHE_CONTAINER_DEFAULT = "project2-cost-cache"
_CACHE_BLOB = "cost-analytics.json"
_ALLOWED_ORIGIN = "https://portal.azure.com"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _json_response(payload: dict, status_code: int = 200) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        status_code=status_code,
        mimetype="application/json",
        headers={
            "Access-Control-Allow-Origin": _ALLOWED_ORIGIN,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-functions-key",
            "Cache-Control": "public, max-age=900",
            "Vary": "Origin",
        },
    )


def _configuration() -> tuple[str, str, str, str]:
    subscription_id = os.environ.get("AZURE_SUBSCRIPTION_ID")
    if not subscription_id:
        # The Functions runtime exposes the active subscription through app settings
        # only if explicitly configured. Set this app setting during deployment.
        raise RuntimeError("Missing required app setting AZURE_SUBSCRIPTION_ID.")

    resource_group = os.environ.get("PROJECT2_COST_RESOURCE_GROUP", "rg-portfolio")
    storage_account = (
        os.environ.get("PROJECT2_COST_STORAGE_ACCOUNT")
        or os.environ.get("AzureWebJobsStorage__accountName")
    )
    if not storage_account:
        raise RuntimeError(
            "Missing PROJECT2_COST_STORAGE_ACCOUNT (or AzureWebJobsStorage__accountName)."
        )
    container_name = os.environ.get(
        "PROJECT2_COST_CONTAINER", _CACHE_CONTAINER_DEFAULT
    )
    return subscription_id, resource_group, storage_account, container_name


def _blob_client(ensure_container: bool = False):
    _, _, account_name, container_name = _configuration()
    credential = DefaultAzureCredential()
    service = BlobServiceClient(
        account_url=f"https://{account_name}.blob.core.windows.net",
        credential=credential,
    )
    container = service.get_container_client(container_name)
    if ensure_container:
        try:
            container.create_container()
        except ResourceExistsError:
            pass
    return container.get_blob_client(_CACHE_BLOB)


def _read_cache() -> dict | None:
    blob = _blob_client()
    try:
        raw = blob.download_blob().readall()
    except ResourceNotFoundError:
        return None
    return json.loads(raw.decode("utf-8"))


def _write_cache(snapshot: dict) -> None:
    blob = _blob_client(ensure_container=True)
    blob.upload_blob(
        json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
        overwrite=True,
        content_settings=ContentSettings(content_type="application/json; charset=utf-8"),
    )


def _retry_delay(exc: HTTPError) -> int:
    # Cost Management emits a dedicated QPU retry-after header for Query API throttles.
    value = (
        exc.headers.get("x-ms-ratelimit-microsoft.costmanagement-qpu-retry-after")
        or exc.headers.get("Retry-After")
        or "60"
    )
    try:
        return max(1, min(int(float(value)), 300))
    except (TypeError, ValueError):
        return 60


def _query_cost_management(subscription_id: str, resource_group: str) -> dict:
    credential = DefaultAzureCredential()
    token = credential.get_token("https://management.azure.com/.default").token
    scope = (
        f"/subscriptions/{subscription_id}/resourceGroups/{resource_group}"
    )
    url = (
        f"https://management.azure.com{scope}"
        f"/providers/Microsoft.CostManagement/query?api-version={_API_VERSION}"
    )
    # A single daily-granularity query returns enough dimensions for all three panels.
    body = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "Daily",
            "aggregation": {
                "totalCost": {"name": "PreTaxCost", "function": "Sum"}
            },
            "grouping": [{"type": "Dimension", "name": "ResourceId"}],
        },
    }
    request_body = json.dumps(body).encode("utf-8")
    for attempt in range(3):
        request = Request(
            url,
            data=request_body,
            method="POST",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 429 and attempt < 2:
                delay = _retry_delay(exc)
                _LOG.warning(
                    "Cost Management throttled this refresh; retrying after %s seconds.",
                    delay,
                )
                time.sleep(delay)
                continue
            detail = exc.read().decode("utf-8", errors="replace")[:1000]
            raise RuntimeError(
                f"Cost Management query failed with HTTP {exc.code}: {detail}"
            ) from exc
        except URLError as exc:
            raise RuntimeError(f"Cost Management network request failed: {exc}") from exc
    raise RuntimeError("Cost Management query exhausted retry attempts.")


def _decimal(value) -> Decimal:
    try:
        return Decimal(str(value or "0"))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def _usage_date(value) -> str:
    if value is None or value == "":
        return ""
    text = str(value)
    if text.isdigit() and len(text) == 8:
        return f"{text[0:4]}-{text[4:6]}-{text[6:8]}"
    return text[:10]


def _build_snapshot(subscription_id: str, resource_group: str) -> dict:
    response = _query_cost_management(subscription_id, resource_group)
    properties = response.get("properties", {})
    columns = [c.get("name", "") for c in properties.get("columns", [])]
    rows = properties.get("rows", [])
    if not columns:
        raise RuntimeError("Cost Management response did not contain column metadata.")

    daily_totals: dict[str, Decimal] = defaultdict(Decimal)
    resource_totals: dict[str, Decimal] = defaultdict(Decimal)
    currency = "Unknown"
    total = Decimal("0")

    for row in rows:
        record = dict(zip(columns, row))
        amount = _decimal(record.get("PreTaxCost", record.get("totalCost", 0)))
        resource_id = str(record.get("ResourceId") or record.get("ResourceID") or "Unknown")
        day = _usage_date(record.get("UsageDate"))
        row_currency = str(record.get("Currency") or "").strip()
        if row_currency:
            currency = row_currency
        total += amount
        resource_totals[resource_id] += amount
        if day:
            daily_totals[day] += amount

    today = _now_utc().date()
    period_start = today.replace(day=1).isoformat()
    daily_costs = [
        {"date": f"{day}T00:00:00Z", "cost": round(float(amount), 4), "currency": currency}
        for day, amount in sorted(daily_totals.items())
    ]
    resource_costs = []
    for resource_id, amount in sorted(
        resource_totals.items(), key=lambda pair: pair[1], reverse=True
    ):
        short_name = resource_id.rstrip("/").split("/")[-1] if resource_id != "Unknown" else "Unknown"
        resource_costs.append({
            "resourceName": short_name,
            "resourceId": resource_id,
            "cost": round(float(amount), 4),
            "currency": currency,
        })

    return {
        "generatedAtUtc": _now_utc().isoformat(),
        "periodStart": period_start,
        "periodEnd": today.isoformat(),
        "resourceGroup": resource_group,
        "currency": currency,
        "summary": {
            "monthToDateCost": round(float(total), 4),
            "currency": currency,
            "resourceCount": len(resource_costs),
        },
        "dailyCosts": daily_costs,
        "resourceCosts": resource_costs,
        "source": "Azure Cost Management Query API",
        "refreshCadence": "Daily",
    }


def refresh_cost_cache() -> dict:
    subscription_id, resource_group, _, _ = _configuration()
    today = _now_utc().date().isoformat()
    existing = _read_cache()
    if existing and str(existing.get("generatedAtUtc", "")).startswith(today):
        return {"refreshed": False, "reason": "Already refreshed today", "snapshot": existing}

    # Do not overwrite the last good cache until the API query and transformation succeed.
    snapshot = _build_snapshot(subscription_id, resource_group)
    _write_cache(snapshot)
    _LOG.info(
        "Updated Project 2 cost cache: %s %s across %s resources.",
        snapshot["currency"],
        snapshot["summary"]["monthToDateCost"],
        snapshot["summary"]["resourceCount"],
    )
    return {"refreshed": True, "snapshot": snapshot}


def create_cost_analytics_blueprint() -> func.Blueprint:
    bp = func.Blueprint()

    @bp.route(
        route="cost-analytics",
        methods=["GET", "OPTIONS"],
        auth_level=func.AuthLevel.FUNCTION,
    )
    def get_cost_analytics(req: func.HttpRequest) -> func.HttpResponse:
        if req.method == "OPTIONS":
            return func.HttpResponse(status_code=204, headers={
                "Access-Control-Allow-Origin": _ALLOWED_ORIGIN,
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Vary": "Origin",
            })
        try:
            cache = _read_cache()
            if cache is None:
                return _json_response({
                    "status": "not_ready",
                    "message": "Cost cache has not been populated yet. The scheduled refresh or an administrator refresh must run first.",
                }, 503)
            return _json_response(cache)
        except Exception:
            _LOG.exception("Unable to read Project 2 cost cache.")
            return _json_response({"status": "error", "message": "Unable to retrieve cached cost analytics."}, 500)

    @bp.route(
        route="cost-cache-refresh",
        methods=["POST"],
        auth_level=func.AuthLevel.FUNCTION,
    )
    def refresh_cost_analytics(req: func.HttpRequest) -> func.HttpResponse:
        try:
            result = refresh_cost_cache()
            return _json_response({
                "status": "ok",
                "refreshed": result["refreshed"],
                "reason": result.get("reason"),
                "generatedAtUtc": result["snapshot"].get("generatedAtUtc"),
                "summary": result["snapshot"].get("summary"),
            })
        except Exception:
            _LOG.exception("Manual Project 2 cost cache refresh failed.")
            return _json_response({"status": "error", "message": "Cost cache refresh failed. Check Function App logs."}, 500)

    @bp.timer_trigger(
        schedule="0 30 2 * * *",
        arg_name="timer",
        run_on_startup=False,
        use_monitor=True,
    )
    def daily_cost_cache_refresh(timer: func.TimerRequest) -> None:
        try:
            result = refresh_cost_cache()
            _LOG.info(
                "Daily Project 2 cost refresh completed; refreshed=%s.",
                result["refreshed"],
            )
        except Exception:
            # Preserve last good snapshot. The next daily run can retry.
            _LOG.exception("Daily Project 2 cost refresh failed; previous cache preserved.")

    return bp
