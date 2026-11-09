import azure.functions as func
import logging
import json
import os
import ipaddress
import urllib.request

from azure.cosmos import CosmosClient
from azure.cosmos.exceptions import (
    CosmosResourceNotFoundError,
    CosmosResourceExistsError
)
from azure.identity import DefaultAzureCredential


app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)


# ============================================================
# Cosmos DB Configuration
# ============================================================

COSMOS_DB_ENDPOINT = os.environ["COSMOS_DB_ENDPOINT"]
DATABASE_NAME = "portfolio-db"
CONTAINER_NAME = "visitor-counters"

credential = DefaultAzureCredential()

cosmos_client = CosmosClient(
    COSMOS_DB_ENDPOINT,
    credential=credential
)

database = cosmos_client.get_database_client(DATABASE_NAME)
container = database.get_container_client(CONTAINER_NAME)


# ============================================================
# Get Visitor IP
# ============================================================

def get_client_ip(req):
    """Extract the visitor's public IP from Azure forwarded headers."""

    headers_to_check = [
        "client-ip",
        "x-forwarded-for"
    ]

    for header in headers_to_check:
        client_ip = req.headers.get(header, "").strip()

        if not client_ip:
            continue

        # X-Forwarded-For can contain multiple IP addresses.
        client_ip = client_ip.split(",")[0].strip()

        # Handle IPv4 addresses containing a port.
        if client_ip.count(":") == 1 and "." in client_ip:
            client_ip = client_ip.rsplit(":", 1)[0]

        # Handle bracketed IPv6 addresses.
        if client_ip.startswith("[") and "]" in client_ip:
            client_ip = client_ip[1:client_ip.index("]")]

        try:
            ip = ipaddress.ip_address(client_ip)

            if not ip.is_global:
                logging.warning(
                    "Visitor IP is not globally routable."
                )
                continue

            logging.info(
                "Public visitor IP detected using header: %s",
                header
            )

            return str(ip)

        except ValueError:
            logging.warning(
                "Invalid IP format in header: %s",
                header
            )

    logging.warning("No valid public visitor IP found.")
    return None


# ============================================================
# Get Visitor Country
# ============================================================

def get_country(ip):
    """Identify visitor country using ipwho.is."""

    if not ip:
        return None

    try:
        url = f"https://ipwho.is/{ip}"

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "AzurePortfolioVisitorCounter/1.0"
            }
        )

        with urllib.request.urlopen(request, timeout=4) as response:
            data = json.loads(
                response.read().decode("utf-8")
            )

        if not data.get("success"):
            logging.warning("Country lookup was unsuccessful.")
            return None

        country_code = data.get("country_code")
        country_name = data.get("country")
        flag = data.get("flag", {}).get("emoji", "🌐")

        if not country_code or not country_name:
            return None

        logging.info(
            "Country lookup successful: %s",
            country_code
        )

        return {
            "code": country_code.upper(),
            "name": country_name,
            "flag": flag
        }

    except Exception as exc:
        logging.warning(
            "Country lookup failed. Error type: %s",
            type(exc).__name__
        )
        return None


# ============================================================
# Increment Visitor Counter
# ============================================================

def increment_counter(document_id):
    """Atomically increment a Cosmos DB visitor counter."""

    try:
        result = container.patch_item(
            item=document_id,
            partition_key=document_id,
            patch_operations=[
                {
                    "op": "incr",
                    "path": "/visitor_count",
                    "value": 1
                }
            ]
        )

    except CosmosResourceNotFoundError:
        try:
            result = container.create_item(
                body={
                    "id": document_id,
                    "visitor_count": 1
                }
            )

        except CosmosResourceExistsError:
            # Handle simultaneous document creation.
            result = container.patch_item(
                item=document_id,
                partition_key=document_id,
                patch_operations=[
                    {
                        "op": "incr",
                        "path": "/visitor_count",
                        "value": 1
                    }
                ]
            )

    return result


# ============================================================
# Update Country Metadata
# ============================================================

def update_country_metadata(country):
    """Store country name and flag in Cosmos DB."""

    document_id = f"country-{country['code']}"

    container.patch_item(
        item=document_id,
        partition_key=document_id,
        patch_operations=[
            {
                "op": "set",
                "path": "/country_name",
                "value": country["name"]
            },
            {
                "op": "set",
                "path": "/flag",
                "value": country["flag"]
            }
        ]
    )


# ============================================================
# Retrieve Country Statistics
# ============================================================

def get_country_statistics():
    """Retrieve all country visitor counters."""

    query = """
        SELECT * FROM c
        WHERE STARTSWITH(c.id, 'country-')
    """

    documents = container.query_items(
        query=query,
        enable_cross_partition_query=True
    )

    countries = []

    for document in documents:
        countries.append({
            "code": document["id"].replace("country-", ""),
            "name": document.get("country_name", "Unknown"),
            "flag": document.get("flag", "🌐"),
            "count": document.get("visitor_count", 0)
        })

    return sorted(
        countries,
        key=lambda country: country["count"],
        reverse=True
    )


# ============================================================
# HTTP API - Visitor Count
# ============================================================

@app.route(
    route="visitor-count",
    methods=["GET"]
)
def visitor_count(req: func.HttpRequest) -> func.HttpResponse:

    logging.info("Visitor count endpoint was called.")

    try:
        # Increment total visitor count.
        total_result = increment_counter("total")

        # Identify visitor IP.
        client_ip = get_client_ip(req)

        # Identify visitor country.
        country = get_country(client_ip)

        # Increment country-specific counter.
        if country:
            country_document_id = f"country-{country['code']}"

            increment_counter(country_document_id)

            update_country_metadata(country)

        # Retrieve country statistics.
        countries = get_country_statistics()

        response = {
            "visitor_count": total_result["visitor_count"],
            "countries": countries,
            "message": "Visitor statistics retrieved successfully."
        }

        return func.HttpResponse(
            body=json.dumps(response),
            status_code=200,
            mimetype="application/json"
        )

    except Exception:
        logging.exception(
            "Failed to retrieve visitor statistics."
        )

        return func.HttpResponse(
            body=json.dumps({
                "error": "Unable to retrieve visitor statistics."
            }),
            status_code=500,
            mimetype="application/json"
        )