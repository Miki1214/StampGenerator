# Stamp Generator

Fully client-side web app that turns drawings, SVG files, or text into a
3D-printable rubber-stamp STL. Built as an npm workspaces monorepo and deployed
to Azure Static Web Apps.

## Packages

- `@stamp-generator/geometry-core` — pure TypeScript geometry pipeline (no DOM)
- `@stamp-generator/web-app` — React + Vite UI

## Local development

```bash
npm ci
npm test
npm run lint
npm run build
npm run dev --workspace=@stamp-generator/web-app
```

## Phase 0 infrastructure

Manual Azure prerequisites (subscription, DevOps service connection, and
remote-state storage) are documented in
[Documentation/phase-0-foundations.md](Documentation/phase-0-foundations.md)
and [infra/bootstrap/README.md](infra/bootstrap/README.md).

Run the bootstrap script once before the first Terraform pipeline run:

```powershell
./infra/bootstrap/create-state-storage.ps1
```
