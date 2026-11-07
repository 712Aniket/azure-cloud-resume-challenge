import azure.functions as func
import logging
import json
import os

from azure.cosmos import CosmosClient
from azure.cosmos.exceptions import (
    CosmosResourceNotFoundError,
    CosmosResourceExistsError
)
from azure.identity import DefaultAzureCredential

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Cosmos DB configuration
COSMOS_DB_ENDPOINT = os.environ["COSMOS_DB_ENDPOINT"]
DATABASE_NAME = "portfolio-db"
CONTAINER_NAME = "visitor-counters"

# Passwordless authentication
credential = DefaultAzureCredential()

cosmos_client = CosmosClient(
    COSMOS_DB_ENDPOINT,
    credential=credential
)

database = cosmos_client.get_database_client(DATABASE_NAME)
container = database.get_container_client(CONTAINER_NAME)


@app.route(route="visitor-count", methods=["GET"])
def visitor_count(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Visitor count endpoint was called.")

    try:
        # Atomically increment the existing counter
        try:
            result = container.patch_item(
                item="total",
                partition_key="total",
                patch_operations=[
                    {
                        "op": "incr",
                        "path": "/visitor_count",
                        "value": 1
                    }
                ]
            )

        except CosmosResourceNotFoundError:
            # Create the counter on its first visit
            try:
                result = container.create_item(
                    body={
                        "id": "total",
                        "visitor_count": 1
                    }
                )

            except CosmosResourceExistsError:
                # Another request created it first; increment instead
                result = container.patch_item(
                    item="total",
                    partition_key="total",
                    patch_operations=[
                        {
                            "op": "incr",
                            "path": "/visitor_count",
                            "value": 1
                        }
                    ]
                )

        response = {
            "visitor_count": result["visitor_count"],
            "message": "Visitor count retrieved successfully."
        }

        return func.HttpResponse(
            body=json.dumps(response),
            status_code=200,
            mimetype="application/json"
        )

    except Exception:
        logging.exception("Failed to update visitor count.")

        return func.HttpResponse(
            body=json.dumps({
                "error": "Unable to retrieve visitor count."
            }),
            status_code=500,
            mimetype="application/json"
        )
