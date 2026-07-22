[< Back to index](index.md)

# Phase 5 - Web App UI (`web-app`)

## Goal

Build the React UI that wires all three input modes, configuration,
validation feedback, and download into one coherent flow - with no live 3D
preview, per the original project scope.

## Components (single responsibility each)

- `DrawingCanvas` - Fabric.js freehand drawing surface.
- `SvgDropZone` - drag-and-drop / file-picker for `.svg` files.
- `TextInputPanel` - text input + bundled-font picker + size input.
- `ConfigPanel` - `designHeightMm` and canvas size/mm mapping inputs. The
  base/handle are a fixed STL model, not user-configurable dimensions.
- `ValidationMessages` - renders the `ValidationResult` issues produced by
  [Phase 2](phase-2-cleanup-validation.md).
- `DownloadButton` - disabled until a valid `PathShapeSet` exists; triggers
  the full pipeline (scale/mirror/extrude/union/export) and the download on
  click.
- `useStampPipeline` - a hook that orchestrates calls into `geometry-core`.
  This is the Dependency Inversion boundary: the UI only ever talks to
  `geometry-core`'s exported interfaces (`ShapeImporter`, `ShapeCleaner`,
  `ShapeValidator`, `StampGeometryBuilder`, `MeshExporter`), never to
  `manifold-3d` directly.

## Contracts

```ts
export type PipelineState =
  | { status: 'idle' }
  | { status: 'importing' }
  | { status: 'validating' }
  | { status: 'ready'; shapes: PathShapeSet }
  | { status: 'invalid'; issues: ValidationIssue[] }

export interface UseStampPipeline {
  state: PipelineState
  importFromSvg(file: File): void
  importFromCanvas(canvas: FabricCanvasLike): void
  importFromText(request: TextImportRequest): void
  download(options: StampOptions): void
}
```

## File layout

```
packages/web-app/src/components/
  DrawingCanvas.tsx
  SvgDropZone.tsx
  TextInputPanel.tsx
  ConfigPanel.tsx
  ValidationMessages.tsx
  DownloadButton.tsx
packages/web-app/src/hooks/
  useStampPipeline.ts
packages/web-app/test/components/
  DrawingCanvas.test.tsx
  SvgDropZone.test.tsx
  TextInputPanel.test.tsx
  ConfigPanel.test.tsx
  ValidationMessages.test.tsx
  DownloadButton.test.tsx
packages/web-app/test/hooks/
  useStampPipeline.test.ts
```

## TDD checklist (Vitest + React Testing Library)

- [ ] `ConfigPanel` rejects a negative `designHeightMm` input with an inline
      error and does not propagate the invalid value upward.
- [ ] `SvgDropZone` calls its import callback with the dropped file's raw
      text contents on drop.
- [ ] `SvgDropZone` rejects non-`.svg` file drops with a visible message,
      without calling the import callback.
- [ ] `TextInputPanel` calls its import callback with the correct
      `TextImportRequest` (text, fontId, fontSizeMm) on submit.
- [ ] `ValidationMessages` renders exactly one message element per issue in a
      `ValidationResult`, using each issue's `message` text.
- [ ] `ValidationMessages` renders nothing when given an `{ ok: true }`
      result.
- [ ] `DownloadButton` is disabled while `useStampPipeline`'s state is
      `importing`, `validating`, or `invalid`.
- [ ] `DownloadButton` is enabled when state is `ready`.
- [ ] `DownloadButton` click, given a `ready` pipeline state, calls
      `triggerDownload` with a non-empty byte array.
- [ ] `useStampPipeline` transitions `idle -> importing -> validating ->
      ready` on a successful import of a clean fixture SVG.
- [ ] `useStampPipeline` transitions `idle -> importing -> validating ->
      invalid` on import of a fixture SVG that fails Phase 2 validation, and
      exposes the resulting issues.

## Acceptance criteria

A user can:
- draw a shape on the canvas, or drop an SVG, or type text,
- configure `designHeightMm`,
- see validation feedback if the input is invalid,
- click download and receive a `.stl` file,

all client-side, with zero network calls.

## Risks / edge cases

- Fabric.js canvas performance on low-end devices/mobile touch input - mobile
  support is explicitly out of scope for v1 unless requested; flagged as an
  open item in [index.md](index.md). If confirmed out of scope, `DrawingCanvas`
  tests target desktop pointer events only.
- Large SVG drops locking the main thread during import - if this proves to
  be a real problem in testing, moving import/cleanup into a Web Worker is
  the fix; noted as a stretch item, not required for MVP-sized designs.
- Keeping `useStampPipeline` as the *only* place that imports from
  `geometry-core` (enforced via the Phase 0 ESLint import-boundary rule)
  avoids components individually coupling to geometry internals - this is the
  practical enforcement mechanism for the Dependency Inversion principle
  named above.

## Dependencies

- **Depends on**: [Phase 1](phase-1-ingestion.md),
  [Phase 2](phase-2-cleanup-validation.md),
  [Phase 3](phase-3-stamp-geometry.md), [Phase 4](phase-4-stl-export.md).
- **Blocks**: [Phase 6](phase-6-e2e-hardening.md).
