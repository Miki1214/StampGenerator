[< Back to index](index.md)

# Phase 1 - Path Ingestion & Normalization (`geometry-core`)

## Goal

Convert any of the three v1 input types (freehand canvas drawing, dropped SVG
file, typed text) into one common, unvalidated `RawPathSet` model that later
phases can process uniformly.

## Contracts

Single-responsibility interface, one importer implementation per source type
(SOLID):

```ts
export interface Point2D { x: number; y: number }
export interface RawRing { points: Point2D[] }
export interface RawPathSet { rings: RawRing[] }

export interface ShapeImporter<TSource> {
  import(source: TSource, tolerance: number): RawPathSet
}

export class SvgFileImporter implements ShapeImporter<string> {}
export class FabricCanvasImporter implements ShapeImporter<FabricCanvasLike> {}
export class TextOutlineImporter implements ShapeImporter<TextImportRequest> {}

export interface TextImportRequest {
  text: string
  fontId: BundledFontId
  fontSizeMm: number
}
```

- Shared, DRY curve-flattening utilities used by all three importers:
  `flattenCubicBezier`, `flattenArc` - pure functions, no class needed
  (KISS).
- Bundled fonts (v1): a small, fixed set (e.g. 2-3 sans/serif TTFs) shipped in
  `geometry-core/assets/fonts`, loaded via `opentype.js`. No custom font
  upload in v1 - see the open item about license confirmation in
  [index.md](index.md).

## File layout

```
packages/geometry-core/src/import/
  types.ts                  # Point2D, RawRing, RawPathSet, ShapeImporter<T>
  curve-flatten.ts          # flattenCubicBezier, flattenArc
  svg-file-importer.ts
  fabric-canvas-importer.ts
  text-outline-importer.ts
packages/geometry-core/assets/fonts/
  ...bundled .ttf files...
packages/geometry-core/test/import/
  curve-flatten.test.ts
  svg-file-importer.test.ts
  fabric-canvas-importer.test.ts
  text-outline-importer.test.ts
```

## TDD checklist

Execute strictly one at a time per
[`.cursor/skills/tdd/SKILL.md`](../.cursor/skills/tdd/SKILL.md): write the
test, watch it fail, write minimal code, watch it pass, refactor, commit -
before moving to the next line.

- [ ] `flattenCubicBezier` returns the correct number of points for a
      degenerate straight-line bezier (control points collinear with
      endpoints).
- [ ] `flattenCubicBezier` respects the given tolerance - a tighter tolerance
      produces more points on a curved segment.
- [ ] `flattenArc` flattens a quarter-circle arc into points that stay within
      tolerance of the true arc.
- [ ] `SvgFileImporter` imports a single `<rect>` as a 4-point ring.
- [ ] `SvgFileImporter` resolves a nested `<g transform="translate(...)">`
      into absolute coordinates.
- [ ] `SvgFileImporter` resolves a `matrix(...)` transform on a `<path>`.
- [ ] `SvgFileImporter` flattens a `<path>` containing cubic beziers within
      tolerance.
- [ ] `SvgFileImporter` throws/returns a descriptive error for malformed SVG
      input (not a silent empty result).
- [ ] `FabricCanvasImporter` imports a single freehand stroke's point path.
- [ ] `FabricCanvasImporter` imports multiple independent strokes as multiple
      rings.
- [ ] `TextOutlineImporter` imports the glyph outline for a single character
      using a bundled font.
- [ ] `TextOutlineImporter` produces multiple rings for a multi-contour glyph
      (e.g. "i" dot + stem) at this raw-import stage - holes are resolved
      later, in [Phase 2](phase-2-cleanup-validation.md), not here.
- [ ] `TextOutlineImporter` correctly spaces/kerns multi-character strings
      using the font's own metrics.

## Acceptance criteria

Given any of the three input types, `import()` returns a `RawPathSet` in
which:
- all curves are flattened to polylines within the configured tolerance,
- all transforms have been resolved into one consistent coordinate space
  (absolute coordinates, no residual `transform` state).

## Risks / edge cases

- Extremely small or zero-length bezier segments causing flattening to
  produce degenerate (duplicate-point) output - must not crash, should be
  filtered.
- SVGs using `<use>`/`<symbol>` references (indirection) - decide explicitly
  whether v1 resolves these or rejects them with a clear validation message;
  default recommendation is to reject with a clear message rather than
  silently ignore.
- RTL / complex-script text shaping is out of scope for v1 - `opentype.js`
  positions simple Latin glyphs left-to-right only; this is a documented
  known limitation, not something this phase attempts to solve.

## Dependencies

- **Depends on**: [Phase 0](phase-0-foundations.md) (tooling/pipeline must
  exist so tests can run in CI).
- **Blocks**: [Phase 2](phase-2-cleanup-validation.md).
