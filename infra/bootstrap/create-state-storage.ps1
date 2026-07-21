# One-time manual bootstrap for Terraform remote state.
# This cannot be Terraform-managed (chicken/egg).

[CmdletBinding()]
param(
  [string]$Location = $(if ($env:LOCATION) { $env:LOCATION } else { "westeurope" }),
  [string]$ResourceGroupName = $(if ($env:RESOURCE_GROUP_NAME) { $env:RESOURCE_GROUP_NAME } else { "stampgen-tfstate-rg" }),
  [string]$StorageAccountName = $(if ($env:STORAGE_ACCOUNT_NAME) { $env:STORAGE_ACCOUNT_NAME } else { "stampgentfstate" }),
  [string]$ContainerName = $(if ($env:CONTAINER_NAME) { $env:CONTAINER_NAME } else { "tfstate" })
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw "Azure CLI (az) is required."
}

Write-Host "Creating resource group '$ResourceGroupName' in '$Location'..."
az group create `
  --name $ResourceGroupName `
  --location $Location `
  --output none

Write-Host "Creating storage account '$StorageAccountName'..."
az storage account create `
  --name $StorageAccountName `
  --resource-group $ResourceGroupName `
  --location $Location `
  --sku Standard_LRS `
  --kind StorageV2 `
  --min-tls-version TLS1_2 `
  --allow-blob-public-access false `
  --output none

Write-Host "Creating blob container '$ContainerName'..."
az storage container create `
  --name $ContainerName `
  --account-name $StorageAccountName `
  --auth-mode login `
  --output none

Write-Host ""
Write-Host "Bootstrap complete. Use these backend values with terraform init:"
Write-Host "  resource_group_name  = $ResourceGroupName"
Write-Host "  storage_account_name = $StorageAccountName"
Write-Host "  container_name       = $ContainerName"
Write-Host "  key                  = stamp-generator.<environment>.tfstate"
