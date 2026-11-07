resource "azurerm_static_web_app" "portfolio" {
  name                = "aniket-portfolio"
  resource_group_name = var.resource_group_name
  location            = "eastasia"

  sku_tier = "Free"
  sku_size = "Free"

  lifecycle {
    ignore_changes = [
      repository_url,
      repository_branch,
      repository_token
    ]
  }
}
