variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  sensitive   = true
}

variable "location" {
  description = "Azure resource location"
  type        = string
  default     = "centralindia"
}

variable "resource_group_name" {
  description = "Existing Azure resource group"
  type        = string
  default     = "rg-portfolio"
}
