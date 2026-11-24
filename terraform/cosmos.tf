resource "azurerm_cosmosdb_account" "portfolio" {
  name                = "aniket-portfolio-cosmos"
  location            = var.location
  resource_group_name = var.resource_group_name

  offer_type                 = "Standard"
  kind                       = "GlobalDocumentDB"
  free_tier_enabled          = true
  automatic_failover_enabled = true

  # Match the security posture verified in Azure on 24 November 2026.
  local_authentication_enabled          = false
  public_network_access_enabled         = true
  is_virtual_network_filter_enabled     = false
  network_acl_bypass_for_azure_services = false

  # The live firewall list contains 31 explicit IP entries plus the 0.0.0.0
  # Azure-datacenter exception. The exact list is maintained out-of-band until
  # its complete, verified value set is committed here. Ignore only this field
  # to prevent an incomplete list from replacing the live allowlist.
  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ip_range_filter]
  }

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

  lifecycle {
    prevent_destroy = true
  }
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

  lifecycle {
    prevent_destroy = true
  }
}
