# __generated__ by Terraform
# Please review these resources and move them into your main configuration files.

# __generated__ by Terraform from "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/rg-portfolio/providers/Microsoft.DocumentDB/databaseAccounts/aniket-portfolio-cosmos/sqlRoleAssignments/1769ccc4-c1bd-487b-817e-10134c1cab93"
resource "azurerm_cosmosdb_sql_role_assignment" "storage_identity" {
  account_name        = "aniket-portfolio-cosmos"
  name                = "1769ccc4-c1bd-487b-817e-10134c1cab93"
  principal_id        = "5618914c-3963-4c57-993f-916b826807f9"
  resource_group_name = "rg-portfolio"
  role_definition_id  = "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/rg-portfolio/providers/Microsoft.DocumentDB/databaseAccounts/aniket-portfolio-cosmos/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  scope               = "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/rg-portfolio/providers/Microsoft.DocumentDB/databaseAccounts/aniket-portfolio-cosmos/dbs/portfolio-db/colls/visitor-counters"
}

# __generated__ by Terraform from "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/rg-portfolio/providers/Microsoft.DocumentDB/databaseAccounts/aniket-portfolio-cosmos/sqlRoleAssignments/31f7df69-6d5f-4ed0-8722-974b330cea8a"
resource "azurerm_cosmosdb_sql_role_assignment" "function_identity" {
  account_name        = "aniket-portfolio-cosmos"
  name                = "31f7df69-6d5f-4ed0-8722-974b330cea8a"
  principal_id        = "0bf646f1-bcfb-4046-a95b-a40d9f7d3b55"
  resource_group_name = "rg-portfolio"
  role_definition_id  = "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/rg-portfolio/providers/Microsoft.DocumentDB/databaseAccounts/aniket-portfolio-cosmos/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  scope               = "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/rg-portfolio/providers/Microsoft.DocumentDB/databaseAccounts/aniket-portfolio-cosmos/dbs/portfolio-db/colls/visitor-counters"
}

# __generated__ by Terraform
resource "azurerm_role_assignment" "storage_blob_contributor" {
  condition                              = null
  delegated_managed_identity_resource_id = null
  description                            = null
  name                                   = "72d97507-fa40-468e-a907-f582bd52b464"
  principal_id                           = "5618914c-3963-4c57-993f-916b826807f9"
  principal_type                         = "ServicePrincipal"
  role_definition_id                     = "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe"
  scope                                  = "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/rg-portfolio/providers/Microsoft.Storage/storageAccounts/aniketportfolio07"
}

# __generated__ by Terraform from "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/rg-portfolio/providers/Microsoft.Insights/components/aniket-portfolio-api"
resource "azurerm_application_insights" "portfolio" {
  application_type                     = "web"
  daily_data_cap_in_gb                 = 100
  daily_data_cap_notifications_enabled = true
  force_customer_storage_for_profiler  = false
  internet_ingestion_enabled           = true
  internet_query_enabled               = true
  ip_masking_enabled                   = true
  local_authentication_enabled         = true
  location                             = "centralindia"
  name                                 = "aniket-portfolio-api"
  resource_group_name                  = "rg-portfolio"
  retention_in_days                    = 90
  sampling_percentage                  = 0
  tags                                 = {}
  workspace_id                         = "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/DefaultResourceGroup-CID/providers/Microsoft.OperationalInsights/workspaces/DefaultWorkspace-8bb846b6-1057-42bb-a02a-7a64e6a34178-CID"
}

# __generated__ by Terraform
resource "azurerm_role_assignment" "storage_blob_owner" {
  condition                              = null
  delegated_managed_identity_resource_id = null
  description                            = null
  name                                   = "628f9154-2f19-4ebc-a511-18aa20de4fad"
  principal_id                           = "5618914c-3963-4c57-993f-916b826807f9"
  principal_type                         = "ServicePrincipal"
  role_definition_id                     = "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/providers/Microsoft.Authorization/roleDefinitions/b7e6dc6d-f1e8-4753-8033-0f276bb0955b"
  scope                                  = "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/rg-portfolio/providers/Microsoft.Storage/storageAccounts/aniketportfolio07"
}

# __generated__ by Terraform


# __generated__ by Terraform
resource "azurerm_function_app_flex_consumption" "portfolio" {
  app_settings = {
    AzureWebJobsStorage__accountName            = "aniketportfolio07"
    AzureWebJobsStorage__credential             = "managedidentity"
    COSMOS_DB_ENDPOINT                          = "https://aniket-portfolio-cosmos.documents.azure.com:443/"
    PYTHON_APPLICATIONINSIGHTS_ENABLE_TELEMETRY = "true"
  }
  client_certificate_enabled         = false
  client_certificate_exclusion_paths = null
  client_certificate_mode            = "Required"
  enabled                            = true
  https_only                         = false
  instance_memory_in_mb              = 2048
  location                           = "centralindia"
  maximum_instance_count             = 100
  name                               = "aniket-portfolio-api"
  public_network_access_enabled      = true
  resource_group_name                = "rg-portfolio"
  runtime_name                       = "python"
  runtime_version                    = "3.11"
  service_plan_id                    = "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/rg-portfolio/providers/Microsoft.Web/serverFarms/ASP-rgportfolio-f2d8"
  storage_authentication_type        = "SystemAssignedIdentity"
  storage_container_endpoint         = "https://aniketportfolio07.blob.core.windows.net/app-package-aniketportfolioapi-1766927"
  storage_container_type             = "blobContainer"
  storage_user_assigned_identity_id  = null
  tags = {
    "hidden-link: /app-insights-resource-id" = "/subscriptions/8bb846b6-1057-42bb-a02a-7a64e6a34178/resourceGroups/rg-portfolio/providers/microsoft.insights/components/aniket-portfolio-api"
  }
  virtual_network_subnet_id                      = null
  webdeploy_publish_basic_authentication_enabled = false
  auth_settings {
    additional_login_parameters    = {}
    allowed_external_redirect_urls = []
    enabled                        = false
    issuer                         = null
    token_refresh_extension_hours  = 0
    token_store_enabled            = false
  }
  identity {
    identity_ids = []
    type         = "SystemAssigned"
  }
  site_config {
    api_definition_url                            = null
    api_management_api_id                         = null
    app_command_line                              = null
    application_insights_connection_string        = null # sensitive
    application_insights_key                      = null # sensitive
    container_registry_managed_identity_client_id = null
    container_registry_use_managed_identity       = false
    default_documents                             = ["Default.htm", "Default.html", "Default.asp", "index.htm", "index.html", "iisstart.htm", "default.aspx", "index.php"]
    elastic_instance_minimum                      = 0
    http2_enabled                                 = false
    ip_restriction_default_action                 = "Allow"
    load_balancing_mode                           = "LeastRequests"
    managed_pipeline_mode                         = "Integrated"
    minimum_tls_version                           = "1.2"
    remote_debugging_enabled                      = false
    remote_debugging_version                      = "VS2022"
    runtime_scale_monitoring_enabled              = false
    scm_ip_restriction_default_action             = "Allow"
    scm_minimum_tls_version                       = "1.2"
    scm_use_main_ip_restriction                   = false
    use_32_bit_worker                             = false
    vnet_route_all_enabled                        = false
    websockets_enabled                            = false
    worker_count                                  = 1
    cors {
      allowed_origins     = ["https://gentle-glacier-047897600.3.azurestaticapps.net"]
      support_credentials = false
    }
  }
  lifecycle {
    ignore_changes = [
      storage_access_key,
      site_config[0].application_insights_connection_string,
      site_config[0].ip_restriction_default_action,
      site_config[0].scm_ip_restriction_default_action
    ]
  }
}
