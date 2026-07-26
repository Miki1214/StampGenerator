[< Back to index](index.md)

# Phase 0 - Foundations & Infrastructure

## Goal

Establish a working CI/CD skeleton and an empty-but-deployed Azure Static Web
App, before any product code exists. Every later phase depends on this
pipeline enforcing lint/test/build gating.

## Manual prerequisites (documented, not automated)

These cannot be automated safely/at all from within the repo and must be done
once, manually, before any pipeline run that touches real Azure resources:

1. Create/identify the target Azure subscription and tenant.
2. Create an Azure DevOps service connection (Workload Identity Federation
   preferred over a long-lived client secret) from
   `dev.azure.com/mrilczuk/StampGenerator` to that subscription.
3. Run `infra/bootstrap/create-state-storage.(sh|ps1)` once, manually, to
   create the resource group + storage account + container that will hold
   Terraform remote state. This step cannot itself be Terraform-managed
   (chicken/egg: Terraform needs a backend to exist before it can run).

## Deliverables

- npm workspaces root `package.json` referencing `packages/geometry-core` and
  `packages/web-app`.
- Shared `tsconfig.base.json`.
- ESLint (`@typescript-eslint`, plus `eslint-plugin-import` boundary rules that
  fail the build if `geometry-core` imports anything DOM-dependent).
- Prettier config, shared across packages.
- Vitest config at each package level.
- `infra/terraform/main.tf`:
  - `azurerm_resource_group`
  - `azurerm_static_web_app` (the Static Web App; replaces deprecated
    `azurerm_static_site`)
  - variables for environment (`dev` / `prod`)
  - `backend "azurerm"` block pointing at the bootstrap storage account
- `azure-pipelines.yml` stages:
  1. `Lint`
  2. `UnitTest`
  3. `Build`
  4. `TerraformPlan` (on PR) / `TerraformApply` (on merge to `main`)
  5. `DeploySwa` (using the `AzureStaticWebApp@0` pipeline task, with PR
     preview environments enabled)

## File layout

```
StampGenerator/
  package.json                # npm workspaces root
  tsconfig.base.json
  .eslintrc.cjs
  .prettierrc
  packages/
    geometry-core/
      package.json
      tsconfig.json
      vitest.config.ts
    web-app/
      package.json
      tsconfig.json
      vitest.config.ts
  infra/
    bootstrap/
      create-state-storage.sh
      create-state-storage.ps1
      README.md
    terraform/
      main.tf
      variables.tf
      outputs.tf
      backend.tf
  azure-pipelines.yml
```

## "TDD checklist" for this phase

Phase 0 is infra/tooling, so there's no product-code unit test in the
traditional sense. The equivalent "test" is verifying the pipeline itself
correctly enforces gating for every later phase:

- [ ] Pipeline fails clearly on a lint error (verify with an intentionally
      broken sample file, committed then reverted).
- [ ] Pipeline fails clearly on a failing placeholder unit test (Red state),
      then passes once the placeholder is fixed (Green state) - this proves
      the pipeline enforces the TDD gate that every later phase relies on.
- [ ] `terraform plan` run twice in a row against the same state shows zero
      changes on the second run (idempotency check).

## Acceptance criteria

- A pull request against `main` triggers lint -> unit test -> build ->
  `terraform plan`, and produces a Static Web App preview URL serving a
  placeholder page.
- A merge to `main` runs `terraform apply` and deploys to the production
  Static Web App.

## Risks / edge cases

- Service connection permission scope: prefer least-privilege
  (Contributor scoped to the one resource group) over subscription-wide
  Owner/Contributor.
- Terraform state locking during concurrent pipeline runs (two PRs triggering
  `terraform plan` at once) - rely on the `azurerm` backend's native blob
  lease locking; do not disable it.
- Azure Static Web Apps free-tier limits (custom domains, number of staging
  environments) if usage grows - flagged again in
  [Phase 7](phase-7-deployment-hardening.md).

## Dependencies

- **Depends on**: nothing - this is the first phase.
- **Blocks**: every other phase (all later phases assume a working
  lint/test/build/deploy pipeline exists).
