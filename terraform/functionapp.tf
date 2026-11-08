resource "azurerm_service_plan" "portfolio" {
  name                = "ASP-rgportfolio-f2d8"
  resource_group_name = var.resource_group_name
  location            = var.location

  os_type  = "Linux"
  sku_name = "FC1"
}
