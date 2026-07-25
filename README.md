# Stamp Generator

Fully client-side web app that turns drawings, SVG files, or text into a
3D-printable rubber-stamp STL. Built as an npm workspaces monorepo and deployed
to Azure Static Web Apps.

## Packages

- `@stamp-generator/geometry-core` — pure TypeScript geometry pipeline (no DOM)
- `@stamp-generator/web-app` — React + Vite UI

## Prerequisites (uv + graphify)

Agent / Cursor workflows in this repo expect a local
[graphify](https://github.com/graphify-labs/graphify) knowledge graph
(`graphify-out/`). Install both tools before exploring or changing code:

```bash
# 1. uv — installs/runs Python CLIs in isolated envs (needed to install graphify)
#    https://docs.astral.sh/uv/getting-started/installation/
#    Windows (PowerShell):
irm https://astral.sh/uv/install.ps1 | iex
#    macOS / Linux:
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. graphifyy — PyPI package that provides the `graphify` CLI
#    (maps the repo into graphify-out/ for agent navigation)
uv tool install graphifyy
uv tool update-shell   # if `graphify` is not on PATH, then open a new terminal

# 3a. graphify install — registers the graphify skill with Cursor / other assistants
graphify install
# 3b. graphify update . — builds or refreshes this repo's knowledge graph (AST-only)
graphify update .
```

Use `graphify query` / `path` / `explain` before broad codebase search; after
code edits, run `graphify update .` again (AST-only).

## Local development

```bash
npm install
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
