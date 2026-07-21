output "resource_group_name" {
  description = "Name of the provisioned resource group."
  value       = azurerm_resource_group.main.name
}

output "static_web_app_name" {
  description = "Name of the Azure Static Web App."
  value       = azurerm_static_web_app.main.name
}

output "static_web_app_default_hostname" {
  description = "Default hostname of the Azure Static Web App."
  value       = azurerm_static_web_app.main.default_host_name
}

output "static_web_app_api_key" {
  description = "Deployment API key for the Azure Static Web App."
  value       = azurerm_static_web_app.main.api_key
  sensitive   = true
}
