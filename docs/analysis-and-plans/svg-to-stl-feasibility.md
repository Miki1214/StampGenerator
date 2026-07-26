# Custom Stamp Generator — SVG/Drawing to 3D STL: Feasibility Analysis

## Concept

User draws an image (or drops an SVG file). The app validates and cleans up the
input, generates a 3D model by extruding the 2D shape to a configurable height
(e.g. 3mm), and offers it as a direct STL download (no live 3D preview
required). Real-world size is derived from the drawing canvas (e.g. a full
canvas = 250mm x 250mm).

**Verdict: Feasible.** This can run entirely client-side in the browser
(drawing/import -> cleanup -> extrude -> STL blob -> download), with no
backend required for the core flow. The hard part isn't the extrusion itself —
it's robustly handling messy/adversarial input while still producing a
watertight, 3D-print-safe mesh.

## Pipeline

### 1. Input normalization

Both input paths ("draw on canvas" and "drop an SVG") should converge to the
same intermediate representation: a set of 2D closed vector paths (polygons,
with holes where relevant, e.g. the hole in "O" or "A").

- **Freehand canvas drawing**: use a vector drawing library (Fabric.js,
  Paper.js, Konva) so strokes are captured as path data directly, avoiding a
  raster-to-vector step. If raster capture is used instead, a trace step
  (potrace / imagetracerjs) is needed to recover an SVG outline.
- **Dropped SVG**: parse directly, but real-world SVGs (Illustrator,
  Inkscape, Figma) are often messy — nested transforms, `<text>` elements not
  converted to paths, strokes instead of fills, tiny self-intersections,
  multiple disjoint subpaths, and inconsistent units (px/mm/pt vs. viewBox
  scaling).

### 2. Validation / cleanup

Frequently underestimated step. Typical operations:

- Flatten all transforms (nested `<g>`, `matrix()`), resolve `viewBox` to
  real-world units.
- Convert `<text>` to outlines (font loading + text-to-path, e.g. via
  opentype.js), since text can't be extruded directly.
- Convert strokes to filled outlines (stroke-to-fill offsetting) if input is
  pen/stroke-based.
- Flatten curves (bezier/arc) into polylines at a chosen tolerance — polygons
  are needed for triangulation/extrusion, not raw curves.
- Union overlapping subpaths, fix self-intersections, remove degenerate/
  zero-area fragments, and enforce correct polygon winding (outer boundary
  CCW, holes CW).
- Detect holes vs. islands correctly (e.g. "O" must remain a hole, not get
  filled in).
- Simplify point count / snap near-duplicate points so triangulation doesn't
  choke on near-zero-length edges.
- Reject or auto-fix pathological cases: open/unclosed paths, disconnected
  fragments below a minimum feature size (physically relevant — hairline
  features won't print or etch reliably).

Recommended libraries for this stage instead of hand-rolling the math:

- **Clipper2** (e.g. via `js-angusj-clipper` or a wasm build) — robust
  boolean ops (union/intersect/difference) and polygon offsetting; the
  standard tool for cleaning up messy/self-intersecting polygons and for
  stroke-to-fill conversion.
- **paper.js** — boolean path operations and general path math, usable
  directly in-browser.
- **opentype.js** — text-to-path outlines, if typed text input is ever
  supported (not just drawn/imported shapes).
- **svgpath** / **svg-path-properties** — path data normalization and
  curve flattening.

### 3. Extrusion to 3D mesh

Once clean 2D polygons (with holes) are available:

- Triangulate each 2D polygon face (**earcut** is the standard: fast, and
  supports holes).
- Build a prism per shape: bottom face (z=0), top face (z=extrudeHeight), and
  side walls connecting corresponding boundary edges (including inner hole
  boundaries).
- **three.js** (`THREE.Shape` with `.holes` + `ExtrudeGeometry`) does this
  automatically and can be used purely as a geometry-construction/export
  library, with no rendering/preview needed.
- Alternative for more geometric robustness (better handling of holes/
  self-intersections than three.js's built-in earcut-based extrude): run
  Clipper cleanup first, triangulate with earcut, then hand-build the prism
  for full control over normals and manifoldness.

### 4. Export to STL

- three.js's `STLExporter` (from `three/examples/jsm`) converts a
  `BufferGeometry`/mesh directly to an STL blob (ASCII or binary), no
  rendering required.
- Prefer binary STL for smaller file size in a "generate and download" flow.
- Ensure correct normals (per-face for STL, since STL doesn't share vertices)
  and a manifold/watertight mesh — slicers and STL viewers are strict about
  non-manifold geometry, especially at extrusion seams and hole boundaries.
  This is the most common source of "STL looks broken" bugs.

### 5. Scale mapping (canvas -> real-world mm)

Canvas-to-mm scaling is a simple linear factor:
`mmPerUnit = 250 / canvasSizeInUnits` (for a 250mm x 250mm canvas). Apply this
to polygon coordinates before extrusion (or scale the final mesh). Keep
extrusion height (Z) as an independently configurable real-mm parameter —
don't derive it from canvas size.

### Stamp-specific design consideration

A real rubber/resin stamp usually isn't just a flat extruded solid — it
typically needs:

- A **base plate** plus the raised design on top (mountable, so only the
  design touches the ink pad).
- A **mirror flip**, since a stamped impression is a mirror image of the
  stamp face. Symmetric glyphs like "A" don't show this, but arbitrary
  text/asymmetric art will read backwards if not mirrored before extrusion.

Decide early whether v1 is:

- **Solid 3D emblem**: extrude the shape as-is (simpler; suitable for
  3D-printable seals/decorative objects), or
- **True rubber-stamp negative**: base plate + mirrored raised design, unioned
  together (needs a boolean union step, e.g. via Clipper/CSG).

## Suggested stack

All feasible client-side (in-browser), no backend required for the core flow:

- **Drawing surface**: Fabric.js or Paper.js — native vector path data,
  avoids raster tracing.
- **SVG import/parsing**: native DOM SVG parsing + `svgpath`/
  `svg-path-properties` for flattening/normalization, or paper.js's SVG
  import (already gives usable path objects).
- **Boolean/cleanup**: Clipper2 (`js-angusj-clipper` or wasm build) for
  union/simplify/offset operations.
- **Triangulation**: `earcut`.
- **3D geometry + STL export**: `three.js` (`THREE.Shape` /
  `ExtrudeGeometry` + `STLExporter`), used as a geometry/export library even
  without a visual preview.
- **Optional server-side fallback**: for more robust CSG (booleans, base-
  plate union, manifold repair), a small Node service using
  `three-bvh-csg` or `manifold-3d` (a wasm library built specifically for
  robust, guaranteed-manifold boolean CSG) — a strong fit for producing
  reliably watertight STLs from arbitrary user shapes.

## Summary

- Fully achievable, fully client-side.
- Simple filled shapes (clean SVGs, block letters, filled canvas paths) work
  well almost immediately with `THREE.Shape` + `ExtrudeGeometry` +
  `STLExporter`.
- The genuinely hard ~10% is robustness against messy/adversarial input:
  self-intersecting freehand strokes, imported SVGs with text/strokes/odd
  transforms, tiny disconnected fragments, and guaranteeing a watertight
  manifold mesh for safe 3D printing. Budget real engineering time for the
  cleanup/validation stage — it is typically larger in scope than the
  extrusion/export stage itself.
