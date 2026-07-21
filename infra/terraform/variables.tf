variable "environment" {
  description = "Deployment environment name."
  type        = string

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be either \"dev\" or \"prod\"."
  }
}

variable "location" {
  description = "Azure region for the resource group and Static Web App."
  type        = string
  default     = "westeurope"
}

variable "backend_resource_group_name" {
  description = "Resource group that holds the Terraform remote-state storage account (created by bootstrap)."
  type        = string
}

variable "backend_storage_account_name" {
  description = "Storage account name for Terraform remote state (created by bootstrap)."
  type        = string
}

variable "backend_container_name" {
  description = "Blob container name for Terraform remote state."
  type        = string
  default     = "tfstate"
}
