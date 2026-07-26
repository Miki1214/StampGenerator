[< Back to index](index.md)

# Phase 3 - Stamp-Negative 3D Geometry Generation (`geometry-core`)

## Goal

Turn a validated `PathShapeSet` (from
[Phase 2](phase-2-cleanup-validation.md)) into a single watertight 3D mesh
representing the real, physical stamp: a mirrored raised design joined to the
underside of a static, pre-modeled base+handle STL (`packages/stls/`), rather
than a base plate generated from scratch.

## Contracts

Small, independently-testable, composable pure functions/steps (KISS + SRP),
rather than one monolithic "generate" function:

```ts
export interface StampOptions {
  designHeightMm: number
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
export function parseBinaryStl(bytes: ArrayBuffer | Uint8Array): Mesh
export function getStampHardwareMesh(part: "handle" | "base"): Mesh
export function scaleBaseMeshToFootprint(base: Mesh, targetWidthMm: number, targetDepthMm: number, minScale?: number): Mesh
export function getMeshBoundingBox(mesh: Mesh): MeshBoundingBox
export function translateMeshZ(mesh: Mesh, dz: number): Mesh
export function unionMeshes(a: Mesh, b: Mesh): Mesh

export interface StampGeometryBuilder {
  build(shapes: PathShapeSet, opts: StampOptions): Mesh
}
```

`StampGeometryBuilder.build()` is a thin composition (a facade, not new
logic):

1. `scaleToMm` -> `mirrorShapes` -> `extrudeShapes` for the design.
2. `getStampHardwareMesh("base")` -> `scaleBaseMeshToFootprint`, which
   stretches the static base model's X/Y footprint (independently per axis)
   to match the *drawn design's actual bounding-box width/depth* in mm -
   not the configured `canvasSizeMm` (the design may not fill the whole
   canvas) - clamped to never shrink below its native modeled size (so the
   static handle's foot can never overhang it). Its thickness (Z) is never
   scaled - it's a fixed part of the model.
3. `getStampHardwareMesh("handle")`, used completely unscaled - its bottom
   is authored to already sit flush with the (unscaled) base's top.
4. `translateMeshZ` the design so its top face touches the (scaled) base's
   bottom face.
5. `unionMeshes` to fuse design + base + handle into one solid, then a
   final `translateMeshZ` normalizes the whole assembly so it starts at
   Z=0 (print-bed friendly).

All heavy geometric lifting (extrusion, boolean union, manifold guarantees)
delegates to `manifold-3d` rather than being reimplemented by hand. STL
triangle-soup input (no shared vertex indices) is welded via
`Mesh.merge()` before being handed to `Manifold.ofMesh()`.

## Static hardware assets

`packages/stls/Handle.stl` and `packages/stls/MinimalBase.stl` are the
canonical source STL files, committed directly to the repo (not generated).
`Handle.stl` is an ergonomic grip authored so its foot sits flush with, and
centered on, `MinimalBase.stl`'s top face at native scale. `MinimalBase.stl`
is intentionally simple (a flat prism) so that scaling its footprint in X/Y
is a trivial, well-defined operation.

A `StampHardwareDataProvider` (set via `setStampHardwareDataProvider`)
supplies the raw STL bytes per environment - Node tests read them from disk
with `fs`, the browser fetches them from `/stls/*.stl` (copied into
`packages/web-app/public/stls/`) - mirroring the existing bundled-fonts
provider pattern.

## File layout

```
packages/stls/
  Handle.stl              # static, never scaled
  MinimalBase.stl         # scaled in X/Y only to fit the design
packages/geometry-core/src/geometry/
  types.ts                    # StampOptions, Mesh
  mirror.ts                   # mirrorShapes
  scale.ts                    # scaleToMm
  extrude.ts                  # extrudeShapes
  mesh-bounds.ts               # getMeshBoundingBox, translateMeshZ, scaleMeshXY
  mesh-to-manifold-solid.ts    # merge()+ofMesh helper shared by union
  stl-mesh-importer.ts         # parseBinaryStl
  stamp-hardware.ts            # provider + getStampHardwareMesh
  scale-base.ts                # scaleBaseMeshToFootprint
  union.ts                     # unionMeshes
  stamp-geometry-builder.ts    # StampGeometryBuilder (composition facade)
packages/geometry-core/test/geometry/
  mirror.test.ts
  scale.test.ts
  extrude.test.ts
  mesh-bounds.test.ts
  stl-mesh-importer.test.ts
  stamp-hardware.test.ts
  scale-base.test.ts
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
- [ ] `parseBinaryStl` round-trips a synthetic single-triangle binary STL and
      rejects ASCII/corrupt input with a clear error.
- [ ] `scaleBaseMeshToFootprint` scales X/Y independently to the target
      footprint, keeps Z untouched, stays centered on the base's own
      bounding-box center, and clamps to a minimum of 1x.
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
- [ ] `StampGeometryBuilder.build()` includes the (unscaled) handle geometry
      and grows the base footprint for a larger `canvasSizeMm`.

## Acceptance criteria

For any valid `PathShapeSet` and `StampOptions`, `build()` returns a single
manifold, watertight `Mesh` with:
- correct real-world millimeter dimensions (per `scaleToMm`),
- correct horizontal mirroring of the design relative to the base,
- the static handle joined unscaled on top of a base whose footprint has
  been stretched (never shrunk) to fit the design.

## Risks / edge cases

- Near-coplanar union boundaries producing degenerate zero-area triangles -
  watch for this in the `manifold-3d` validity check, not just visually.
- A design whose `canvasSizeMm` is much larger than the base's native
  footprint could leave the handle looking disproportionately small on a
  very wide base - out of scope to enforce automatically in v1, but worth a
  UI hint in [Phase 5](phase-5-web-app-ui.md).
- Extremely large canvas-to-mm scale factors producing self-intersecting
  mirrored geometry at shape edges once scaled - guard by re-applying the
  Phase 2 `minFeatureSizeMm` rule *after* scaling, not only before.
- STL triangle-soup input that doesn't weld cleanly within `manifold-3d`'s
  default tolerance (e.g. a hardware model with a genuine gap) would produce
  a non-manifold solid - `Mesh.merge()` is best-effort, not a guarantee.

## Dependencies

- **Depends on**: [Phase 2](phase-2-cleanup-validation.md).
- **Blocks**: [Phase 4](phase-4-stl-export.md).
