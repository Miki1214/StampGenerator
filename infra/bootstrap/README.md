# Terraform remote-state bootstrap

This folder holds the **one-time, manual** Azure CLI bootstrap that creates
the storage used by Terraform's `azurerm` backend. It is intentionally **not**
managed by Terraform (chicken/egg: Terraform needs a backend before it can
manage resources).

## Prerequisites

1. An Azure subscription and tenant identified for Stamp Generator.
2. An Azure DevOps service connection from
   `https://dev.azure.com/mrilczuk/StampGenerator` to that subscription
   (Workload Identity Federation preferred).
3. Azure CLI installed and logged in (`az login`) with permission to create a
   resource group and storage account in the target subscription.

## Run once

Bash:

```bash
./infra/bootstrap/create-state-storage.sh
```

PowerShell:

```powershell
./infra/bootstrap/create-state-storage.ps1
```

Optional environment overrides:

- `LOCATION` (default `westeurope`)
- `RESOURCE_GROUP_NAME` (default `stampgen-tfstate-rg`)
- `STORAGE_ACCOUNT_NAME` (default `stampgentfstate`)
- `CONTAINER_NAME` (default `tfstate`)

## After bootstrap

1. Copy `infra/terraform/example.tfvars` and fill in the printed backend names
   (do not commit real `.tfvars` with secrets or subscription-specific values).
2. Align `azure-pipelines.yml` variables
   `terraformBackendResourceGroup`, `terraformBackendStorageAccount`, and
   `terraformBackendContainer` with the same values.
3. Run `terraform init` with `-backend-config=...` (the pipeline does this
   automatically once the service connection exists).

## What this creates

- Resource group for Terraform state only
- Storage account (TLS 1.2+, no public blob access)
- Private blob container `tfstate` for state + native blob lease locking
