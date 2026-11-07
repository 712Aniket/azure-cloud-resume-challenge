resource "azurerm_cosmosdb_account" "portfolio" {
  name                = "aniket-portfolio-cosmos"
  location            = var.location
  resource_group_name = var.resource_group_name

  offer_type                 = "Standard"
  kind                       = "GlobalDocumentDB"
  free_tier_enabled          = true
  automatic_failover_enabled = true
  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }
}

resource "azurerm_cosmosdb_sql_database" "portfolio" {
  name                = "portfolio-db"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.portfolio.name
  throughput          = 1000
}

resource "azurerm_cosmosdb_sql_container" "visitor_counters" {
  name                = "visitor-counters"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.portfolio.name
  database_name       = azurerm_cosmosdb_sql_database.portfolio.name

  partition_key_paths = ["/id"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }
  }
}
