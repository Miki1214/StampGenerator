#!/usr/bin/env bash
set -euo pipefail

# One-time manual bootstrap for Terraform remote state.
# This cannot be Terraform-managed (chicken/egg).

LOCATION="${LOCATION:-westeurope}"
RESOURCE_GROUP_NAME="${RESOURCE_GROUP_NAME:-stampgen-tfstate-rg}"
STORAGE_ACCOUNT_NAME="${STORAGE_ACCOUNT_NAME:-stampgentfstate}"
CONTAINER_NAME="${CONTAINER_NAME:-tfstate}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI (az) is required." >&2
  exit 1
fi

echo "Creating resource group '${RESOURCE_GROUP_NAME}' in '${LOCATION}'..."
az group create \
  --name "${RESOURCE_GROUP_NAME}" \
  --location "${LOCATION}" \
  --output none

echo "Creating storage account '${STORAGE_ACCOUNT_NAME}'..."
az storage account create \
  --name "${STORAGE_ACCOUNT_NAME}" \
  --resource-group "${RESOURCE_GROUP_NAME}" \
  --location "${LOCATION}" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --output none

echo "Creating blob container '${CONTAINER_NAME}'..."
az storage container create \
  --name "${CONTAINER_NAME}" \
  --account-name "${STORAGE_ACCOUNT_NAME}" \
  --auth-mode login \
  --output none

echo
echo "Bootstrap complete. Use these backend values with terraform init:"
echo "  resource_group_name  = ${RESOURCE_GROUP_NAME}"
echo "  storage_account_name = ${STORAGE_ACCOUNT_NAME}"
echo "  container_name       = ${CONTAINER_NAME}"
echo "  key                  = stamp-generator.<environment>.tfstate"
