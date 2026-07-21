[< Back to index](index.md)

# Phase 3 - Stamp-Negative 3D Geometry Generation (`geometry-core`)

## Goal

Turn a validated `PathShapeSet` (from
[Phase 2](phase-2-cleanup-validation.md)) into a single watertight 3D mesh
representing the real, physical stamp: a mirrored raised design fused onto a
base plate.

## Contracts

Small, independently-testable, composable pure functions/steps (KISS + SRP),
rather than one monolithic "generate" function:

```ts
export interface StampOptions {
  designHeightMm: number
  baseThicknessMm: number
  canvasSizeUnits: number
  canvasSizeMm: number   // e.g. 250
}

export interface Mesh {
  vertices: Float32Array
  triangleIndices: Uint32Array
}

export function mirrorShapes(shapes: PathShapeSet): PathShapeSet
export function scaleToMm(shapes: PathShapeSet, opts: StampOptions): PathShapeSet
export function extrudeShapes(shapes: PathShapeSet, heightMm: number): Mesh
export function buildBasePlate(canvasSizeMm: number, thicknessMm: number): Mesh
export function unionMeshes(a: Mesh, b: Mesh): Mesh

export interface StampGeometryBuilder {
  build(shapes: PathShapeSet, opts: StampOptions): Mesh
}
```

`StampGeometryBuilder.build()` is a thin composition (a facade, not new
logic):

1. `scaleToMm` -> `mirrorShapes` -> `extrudeShapes` for the design.
2. `buildBasePlate` for the base, offset in Z by `baseThicknessMm` so the
   design sits on top of it.
3. `unionMeshes` to fuse both into one solid.

All heavy geometric lifting (extrusion, boolean union, manifold guarantees)
delegates to `manifold-3d` rather than being reimplemented by hand.

## File layout

```
packages/geometry-core/src/geometry/
  types.ts              # StampOptions, Mesh
  mirror.ts             # mirrorShapes
  scale.ts              # scaleToMm
  extrude.ts            # extrudeShapes
  base-plate.ts         # buildBasePlate
  union.ts              # unionMeshes
  stamp-geometry-builder.ts   # StampGeometryBuilder (composition facade)
packages/geometry-core/test/geometry/
  mirror.test.ts
  scale.test.ts
  extrude.test.ts
  base-plate.test.ts
  union.test.ts
  stamp-geometry-builder.test.ts
```

## TDD checklist

- [ ] `mirrorShapes` flips X coordinates around the shape-set's bounding-box
      center (verify on an asymmetric test shape, not a symmetric one like
      "A" - a symmetric shape would pass even with a broken mirror).
- [ ] `scaleToMm` maps a known canvas-unit bounding box to the expected
      millimeter bounding box, given `canvasSizeUnits`/`canvasSizeMm`.
- [ ] `extrudeShapes` on a simple square ring produces a mesh with the
      expected vertex count and Z bounds `[0, height]`.
- [ ] `extrudeShapes` on a polygon-with-hole (e.g. "O") produces a mesh whose
      volume matches the analytically expected annulus volume within a small
      tolerance.
- [ ] `buildBasePlate` produces a manifold rectangular prism of the expected
      X/Y/Z dimensions.
- [ ] `unionMeshes` of a design solid sitting fully above (non-overlapping
      with) a base plate produces a single mesh whose reported volume equals
      the sum of both input volumes.
- [ ] `unionMeshes` of two overlapping solids produces a mesh whose volume is
      strictly less than the sum of the two input volumes (overlap is not
      double-counted).
- [ ] `StampGeometryBuilder.build()` end-to-end on a known simple asymmetric
      shape produces a mesh that `manifold-3d` itself reports as
      valid/manifold (its `isManifold`-equivalent check).
- [ ] `StampGeometryBuilder.build()` end-to-end produces correctly mirrored
      output (regression test combining mirror + extrude + union in one
      pass).

## Acceptance criteria

For any valid `PathShapeSet` and `StampOptions`, `build()` returns a single
manifold, watertight `Mesh` with:
- correct real-world millimeter dimensions (per `scaleToMm`),
- correct horizontal mirroring of the design relative to the base plate.

## Risks / edge cases

- Near-coplanar union boundaries producing degenerate zero-area triangles -
  watch for this in the `manifold-3d` validity check, not just visually.
- Very thin base plates relative to design height (structural fragility) -
  out of scope to enforce automatically in v1, but worth a UI hint in
  [Phase 5](phase-5-web-app-ui.md).
- Extremely large canvas-to-mm scale factors producing self-intersecting
  mirrored geometry at shape edges once scaled - guard by re-applying the
  Phase 2 `minFeatureSizeMm` rule *after* scaling, not only before.

## Dependencies

- **Depends on**: [Phase 2](phase-2-cleanup-validation.md).
- **Blocks**: [Phase 4](phase-4-stl-export.md).
