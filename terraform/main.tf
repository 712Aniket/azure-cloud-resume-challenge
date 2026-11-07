resource "azurerm_resource_group" "portfolio" {
  name     = var.resource_group_name
  location = var.location
}
