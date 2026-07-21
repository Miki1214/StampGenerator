terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

locals {
  name_prefix = "stampgen-${var.environment}"
}

resource "azurerm_resource_group" "main" {
  name     = "${local.name_prefix}-rg"
  location = var.location

  tags = {
    project     = "StampGenerator"
    environment = var.environment
  }
}

resource "azurerm_static_web_app" "main" {
  name                = "${local.name_prefix}-swa"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = {
    project     = "StampGenerator"
    environment = var.environment
  }
}
