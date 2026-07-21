[< Back to index](index.md)

# Phase 2 - Cleanup & Validation (`geometry-core`)

## Goal

Turn a `RawPathSet` (from [Phase 1](phase-1-ingestion.md)) into a validated
`PathShapeSet` - correctly wound polygons with correctly identified holes -
or a clear, actionable validation error that the UI can display.

## Contracts

```ts
export interface Ring { points: Point2D[] }
export interface PolygonWithHoles { outer: Ring; holes: Ring[] }
export type PathShapeSet = PolygonWithHoles[]

export interface ShapeCleaner {
  clean(raw: RawPathSet): PathShapeSet
}

export interface ShapeValidator {
  validate(shapes: PathShapeSet, rules: ValidationRules): ValidationResult
}

export interface ValidationRules {
  minFeatureSizeMm: number
  maxRingCount: number
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; issues: ValidationIssue[] }

export interface ValidationIssue {
  code: string
  message: string
}
```

`ShapeCleaner` is implemented on top of `manifold-3d`'s `CrossSection` type:
union overlapping rings, correct winding order, and resolve holes vs.
separate islands automatically via a nonzero/even-odd fill-rule union rather
than hand-rolled polygon math (avoids reinventing a notoriously
bug-prone algorithm - KISS).

## File layout

```
packages/geometry-core/src/validate/
  types.ts                 # Ring, PolygonWithHoles, PathShapeSet, ValidationRules, ValidationResult
  shape-cleaner.ts          # ShapeCleaner impl (wraps manifold-3d CrossSection)
  shape-validator.ts        # ShapeValidator impl
packages/geometry-core/test/validate/
  shape-cleaner.test.ts
  shape-validator.test.ts
  fixtures/
    overlapping-rectangles.json
    reversed-winding.json
    letter-o-hole.json
    self-intersecting-stroke.json
```

## TDD checklist

- [ ] Two overlapping rectangle rings clean into a single unioned outer ring.
- [ ] A ring with reversed (clockwise) outer winding is corrected to
      counter-clockwise.
- [ ] A ring fully enclosed by another ring becomes a hole (e.g. the "O"
      letter case), not an incorrectly-filled separate island.
- [ ] A self-intersecting freehand stroke ring cleans into a single valid
      simple polygon (no self-intersections remain).
- [ ] A shape containing a feature narrower than `minFeatureSizeMm` fails
      validation with a descriptive `ValidationIssue` (not a generic error).
- [ ] A `RawPathSet` with zero rings fails validation with an "empty design"
      issue rather than throwing an unhandled exception.
- [ ] A `RawPathSet` whose ring count exceeds `maxRingCount` fails validation
      with a descriptive issue before any expensive union work runs (fail
      fast).

## Acceptance criteria

Any `RawPathSet` produced by Phase 1 either:
- cleans into a valid `PathShapeSet`, ready to hand to
  [Phase 3](phase-3-stamp-geometry.md), or
- fails `validate()` with a `ValidationResult` containing one or more
  actionable `ValidationIssue`s that [Phase 5](phase-5-web-app-ui.md)'s
  `ValidationMessages` component can render directly.

## Risks / edge cases

- Pathological inputs (thousands of tiny disconnected freehand strokes)
  causing slow union operations - mitigated by the `maxRingCount` cap with a
  friendly rejection message, applied before the expensive cleanup step runs,
  not after.
- Floating-point precision near-misses in winding/hole detection for very
  small shapes - covered by fixture tests using intentionally tiny
  coordinates.

## Dependencies

- **Depends on**: [Phase 1](phase-1-ingestion.md).
- **Blocks**: [Phase 3](phase-3-stamp-geometry.md),
  [Phase 5](phase-5-web-app-ui.md) (validation messaging).
