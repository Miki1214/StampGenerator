terraform {
  backend "azurerm" {
    # Populated at init time from pipeline / bootstrap outputs, e.g.:
    # terraform init \
    #   -backend-config="resource_group_name=..." \
    #   -backend-config="storage_account_name=..." \
    #   -backend-config="container_name=tfstate" \
    #   -backend-config="key=stamp-generator.${environment}.tfstate"
  }
}
