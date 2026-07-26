[< Back to index](index.md)

# Phase 7 - Deployment Hardening

## Goal

Bring the Azure DevOps + Terraform pipeline established in
[Phase 0](phase-0-foundations.md) to production-readiness.

## Deliverables

- **Branch policies on `main`**:
  - required pull request (no direct pushes),
  - required green pipeline (lint + unit tests + build + the
    [Phase 6](phase-6-e2e-hardening.md) e2e suite),
  - required reviewer approval.
- **Production release gate**: optional manual approval step before
  `terraform apply` / production Static Web App deploy, if the team wants a
  human checkpoint between "PR merged" and "live in production".
- **Optional custom domain + DNS**: via Terraform (`azurerm_dns_*` resources)
  or an externally-managed DNS provider - left open, see below.
- **Rollback procedure documentation**: how to redeploy the previous known-good
  Static Web App build using pipeline artifact retention, without manual
  Azure Portal intervention.

## File layout

```
azure-pipelines.yml            # extended with branch-policy-enforced stages
                                # and an optional manual approval gate
infra/terraform/
  dns.tf                        # optional, only if custom domain is confirmed
Documentation/
  phase-7-deployment-hardening.md   # this file - includes the rollback runbook
```

## Rollback runbook (to be filled in with concrete pipeline artifact IDs once Phase 0/7 are implemented)

1. Identify the last known-good pipeline run (via Azure Pipelines run
   history).
2. Re-run that pipeline's `DeploySwa` stage against the existing build
   artifact (do not rebuild from source, to guarantee byte-for-byte parity
   with what was previously verified).
3. Verify the Static Web App is serving the rolled-back build (smoke check).
4. If the regression was caused by an infra change (not just app code), also
   identify and revert the corresponding Terraform change, then re-run
   `terraform plan`/`apply` before re-attempting the app deploy.

## "TDD checklist" for this phase

As with Phase 0, this is infra/process hardening rather than product code.
The equivalent verification steps:

- [ ] A PR that intentionally fails the e2e suite is blocked from merging by
      branch policy (verified with a temporary, reverted failing test).
- [ ] A direct push attempt to `main` is rejected (branch policy check).
- [ ] The rollback runbook above is executed at least once in a non-production
      context (e.g. against a staging/preview environment) to confirm it
      actually works before relying on it for a real incident.

## Acceptance criteria

- A broken PR cannot reach `main`.
- A bad production deploy can be rolled back via the documented, tested
  procedure above, without manual Azure Portal surgery.

## Risks / edge cases

- Azure Static Web Apps free-tier limits on custom domains/staging slots may
  force a tier upgrade if a custom domain is confirmed as in-scope - revisit
  the Terraform `sku_tier` setting from Phase 0 if so.
- Manual approval gates add latency to releases - only add the production
  release gate if the team actually wants that trade-off; otherwise merge-to-
  `main` can deploy directly once Phase 6's e2e suite is trusted.

## Dependencies

- **Depends on**: [Phase 0](phase-0-foundations.md),
  [Phase 6](phase-6-e2e-hardening.md).
- **Blocks**: none - this is the final phase for the v1 scope defined in
  [index.md](index.md).

## Open items carried from index.md

- Whether a custom domain is wanted for the Static Web App now or deferred
  indefinitely (determines whether `dns.tf` is created in this phase at all).
