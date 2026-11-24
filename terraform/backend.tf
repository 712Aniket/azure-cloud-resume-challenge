terraform {
  backend "azurerm" {
    resource_group_name  = "rg-portfolio"
    storage_account_name = "aniketterraformstate26"
    container_name       = "project1-tfstate"
    key                  = "project1.tfstate"

    use_azuread_auth = true
  }
}
