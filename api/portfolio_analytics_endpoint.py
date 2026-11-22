#!/usr/bin/env python3
"""Read-only, aggregated portfolio analytics endpoint for Azure Workbooks.

Register this blueprint from the existing Project 1 Function App:
    from portfolio_analytics_endpoint import create_portfolio_analytics_blueprint
    app.register_functions(create_portfolio_analytics_blueprint(container))

The `container` argument is the existing Cosmos DB container client used by
Project 1. This endpoint performs reads only and never returns visitor hashes.
"""
from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import azure.functions as func


CERTIFICATE_IDS = (
    "AI-900",
    "AWS-CCP",
    "AZ-104",
    "AZ-900",
    "Google-Cloud-Digital-Leader",
    "ITIL-4",
)


def create_portfolio_analytics_blueprint(container):
    bp = func.Blueprint()

    def json_response(body, status_code=200):
        # Add https://portal.azure.com to Function App CORS settings as well.
        return func.HttpResponse(
            json.dumps(body, ensure_ascii=False),
            status_code=status_code,
            mimetype="application/json",
            headers={
                "Access-Control-Allow-Origin": "https://portal.azure.com",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Cache-Control": "no-store",
                "Vary": "Origin",
            },
        )

    def query_items(query):
        return list(container.query_items(
            query=query,
            enable_cross_partition_query=True,
        ))

    @bp.route(
        route="portfolio-analytics",
        methods=["GET", "OPTIONS"],
        auth_level=func.AuthLevel.ANONYMOUS,
    )
    def portfolio_analytics(req: func.HttpRequest) -> func.HttpResponse:
        if req.method == "OPTIONS":
            return func.HttpResponse(
                status_code=204,
                headers={
                    "Access-Control-Allow-Origin": "https://portal.azure.com",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Vary": "Origin",
                },
            )

        try:
            total_doc = container.read_item(item="total", partition_key="total")
            total_visitors = int(total_doc.get("visitor_count", 0) or 0)

            country_docs = query_items("""
                SELECT * FROM c WHERE STARTSWITH(c.id, 'country-')
            """)
            event_docs = query_items("""
                SELECT * FROM c WHERE STARTSWITH(c.id, 'analytics-')
            """)
            engagement_docs = query_items("""
                SELECT * FROM c WHERE STARTSWITH(c.id, 'engagement-')
            """)

            event_totals = defaultdict(int)
            for item in event_docs:
                key = (
                    item.get("item_type", ""),
                    item.get("item_id", ""),
                    item.get("event_type", ""),
                )
                event_totals[key] += int(item.get("event_count", 0) or 0)

            resume_views = event_totals[("resume", "resume", "view")]
            resume_downloads = event_totals[("resume", "resume", "download")]
            certificate_rows = []
            for cert_id in CERTIFICATE_IDS:
                certificate_rows.append({
                    "certificate": cert_id,
                    "views": event_totals[("certificate", cert_id, "view")],
                    "downloads": event_totals[("certificate", cert_id, "download")],
                })

            countries = []
            for item in country_docs:
                visitors = int(item.get("visitor_count", 0) or 0)
                country_name = item.get("country_name", "Unknown")
                flag = item.get("flag", "")
                countries.append({
                    "country": f"{flag} {country_name}".strip(),
                    "visitors": visitors,
                    "sharePct": round(100.0 * visitors / total_visitors, 2) if total_visitors else 0.0,
                })
            countries.sort(key=lambda x: x["visitors"], reverse=True)

            section_totals = defaultdict(lambda: {"views": 0, "activeSeconds": 0})
            sessions = 0
            active_seconds = 0
            all_like_docs = []
            for item in engagement_docs:
                metric = item.get("metric_type")
                if metric == "session":
                    sessions += int(item.get("session_count", 0) or 0)
                    active_seconds += int(item.get("total_active_seconds", 0) or 0)
                elif metric == "section":
                    section = item.get("section_id", "Other")
                    section_totals[section]["views"] += int(item.get("view_count", 0) or 0)
                    section_totals[section]["activeSeconds"] += int(item.get("total_active_seconds", 0) or 0)
                elif metric == "like":
                    all_like_docs.append(item)

            engagement = [
                {"section": section.title(), **values}
                for section, values in sorted(section_totals.items(), key=lambda x: x[1]["views"], reverse=True)
            ]

            # Likes use a date-salted visitor hash. Unique appreciators are therefore
            # calculated per day, never presented as all-time unique people.
            today = datetime.now(timezone.utc).date()
            start_day = today - timedelta(days=29)
            daily = defaultdict(lambda: {"likeEvents": 0, "hashes": set()})
            for item in all_like_docs:
                raw = str(item.get("event_date", "")).strip()
                try:
                    day = datetime.strptime(raw, "%Y%m%d").date()
                except ValueError:
                    continue
                if day < start_day or day > today:
                    continue
                key = day.isoformat()
                daily[key]["likeEvents"] += 1
                visitor_hash = item.get("visitor_hash")
                if visitor_hash:
                    daily[key]["hashes"].add(str(visitor_hash))

            daily_appreciations = []
            for offset in range(30):
                day = start_day + timedelta(days=offset)
                metrics = daily[day.isoformat()]
                daily_appreciations.append({
                    "date": day.isoformat() + "T00:00:00Z",
                    "likeEvents": metrics["likeEvents"],
                    "uniqueAppreciators": len(metrics["hashes"]),
                })

            total_likes = len(all_like_docs)
            total_cert_views = sum(x["views"] for x in certificate_rows)
            total_cert_downloads = sum(x["downloads"] for x in certificate_rows)
            kpis = [
                {"title": "Total Visitors", "value": total_visitors, "subtitle": "All time"},
                {"title": "Countries", "value": len(countries), "subtitle": "Visitor locations"},
                {"title": "Resume Views", "value": resume_views, "subtitle": "All time"},
                {"title": "Resume Downloads", "value": resume_downloads, "subtitle": "All time"},
                {"title": "Certificate Views", "value": total_cert_views, "subtitle": "All certificates"},
                {"title": "Certificate Downloads", "value": total_cert_downloads, "subtitle": "All certificates"},
                {"title": "Appreciations", "value": total_likes, "subtitle": "Recorded likes"},
            ]
            resume_kpis = [
                {"title": "Resume Views", "value": resume_views, "subtitle": "All time"},
                {"title": "Resume Downloads", "value": resume_downloads, "subtitle": "All time"},
            ]

            return json_response({
                "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
                "kpis": kpis,
                "countries": countries[:10],
                "resumeKpis": resume_kpis,
                "certificates": certificate_rows,
                "engagement": engagement,
                "dailyAppreciations": daily_appreciations,
                "portfolioSessions": sessions,
                "activeSeconds": active_seconds,
            })

        except Exception as exc:
            logging.exception("Portfolio analytics read endpoint failed.")
            return json_response({"error": "Unable to retrieve portfolio analytics."}, 500)

    return bp
