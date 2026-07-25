---
name: SVG resize handle
overview: Add a corner resize handle to uploaded SVG groups on the drawing canvas (drag to scale, proportionally, like the existing rotate handle) and remove the now-redundant "Size (% of stamp)" numeric input from the SVG panel, since size is set on the canvas instead.
todos:
  - id: baseline
    content: Run web-app test suite to confirm clean baseline
    status: completed
  - id: canvas-red
    content: Update DrawingCanvas.test.tsx to assert scaling unlocked + br handle visible (red)
    status: completed
  - id: canvas-green
    content: Unlock lockScalingX/Y and show br control in DrawingCanvas.tsx group setup (green)
    status: completed
  - id: panel-red
    content: Update CollapsibleSvgPanel.test.tsx to drop size-input assertions and % badge, update hint copy (red)
    status: completed
  - id: panel-green
    content: Remove Size (% of stamp) input, sizePercent state, and % badge from SvgInputPanel.tsx (green)
    status: completed
  - id: refactor
    content: Refactor pass and re-run full web-app suite
    status: completed
  - id: graphify
    content: Run graphify update . after implementation
    status: completed
isProject: false
---

## Background

Uploaded SVGs are added to the Fabric canvas as a single `Group` tagged with `stampSvgId`. Today that group only exposes a rotate handle (`mtr`); scaling is explicitly locked and hidden:

```501:525:packages/web-app/src/components/DrawingCanvas.tsx
const group = new Group(polygons, {
  selectable: true,
  evented: true,
  hasBorders: true,
  hasControls: true,
  lockScalingX: true,
  lockScalingY: true,
  lockRotation: false,
  hoverCursor: "move",
  moveCursor: "move",
});
(group as StampFabricObject).stampSvgId = options.svgId;
group.setControlsVisibility({
  tl: false, tr: false, bl: false, br: false,
  ml: false, mr: false, mt: false, mb: false,
  mtr: true,
});
```

The only current way to size an SVG is the **"Size (% of stamp)"** number input in [`SvgInputPanel.tsx`](packages/web-app/src/components/SvgInputPanel.tsx), which bakes a `sizeFraction` into the geometry once, at import/drop time only — it has no effect afterward. A prior plan ([`svg_canvas_drag_f565d5ea.plan.md`](.cursor/plans/svg_canvas_drag_f565d5ea.plan.md)) explicitly scoped resize handles as **out of scope**; this plan reverses that and removes the now-redundant input.

Export already reads live Fabric transforms via `calcTransformMatrix()` (in `pathPointsInCanvasSpace`/`polygonPointsInCanvasSpace`), which includes `scaleX`/`scaleY` unconditionally — so once the handle is unlocked, resizing "just works" for the preview/STL export with no export-side changes needed.

Fabric's default corner controls (`tl`/`tr`/`bl`/`br`) use a `scalingEqually` action handler, so enabling one corner keeps width/height proportional automatically — no extra aspect-ratio logic required.

## Changes

### 1. `DrawingCanvas.tsx` — enable one resize handle, remove the rest

- Change `lockScalingX: true, lockScalingY: true` → `false, false` on the group.
- In `setControlsVisibility`, flip `br: true` (bottom-right resize handle) and keep `mtr: true`; leave `tl`/`tr`/`bl`/`ml`/`mr`/`mt`/`mb` hidden.
- No listener changes needed: `object:modified` already clears guides and calls `notifySceneChange()`; the existing `mouse:down:before` corner-hit gate (`active.findControl(pointer, false)`) already works for any visible control, not just `mtr`.

### 2. `SvgInputPanel.tsx` — remove the size input

- Delete `sizePercent` state, `clampPercent`, the `useEffect` syncing it from `selectedLayer`, and the `<input type="number" aria-label="Size (% of stamp)">` block.
- `buildPlacement` always uses `DEFAULT_SVG_SIZE_PERCENT` (40%) — imports stay centered at a fixed default size; resizing happens afterward via the new canvas handle.
- Remove the per-layer `{Math.round(layer.placement.sizeFraction * 100)}%` badge in the uploaded-SVG list (it would go stale once the canvas handle resizes the object, since `placement` isn't updated after drop).
- Update the hint copy to mention resize, e.g. *"Click and drag an SVG on the canvas to reposition it; use the handles to rotate or resize."*

### 3. Tests (TDD, one behavior per red/green step)

Baseline: run `packages/web-app` test suite first.

- **Red/Green — canvas control:** update the existing test *"adds an SVG import as a selectable group with borders, rotate enabled, and scale locked"* in [`DrawingCanvas.test.tsx`](packages/web-app/test/components/DrawingCanvas.test.tsx) to assert `lockScalingX`/`lockScalingY` are `false`, `isControlVisible("br")` is `true`, and other corner/edge controls stay `false`; rename the test to reflect resize being enabled. Implement the `DrawingCanvas.tsx` change to go green.
- **Red/Green — panel UI:** update [`CollapsibleSvgPanel.test.tsx`](packages/web-app/test/components/CollapsibleSvgPanel.test.tsx):
  - Assert the "Size (% of stamp)" label/input no longer exists when the panel is expanded.
  - Simplify the drop-import test to assert `onImport` receives the fixed default placement (`sizeFraction: 0.4`) without touching any size input.
  - Assert the per-layer `%` badge is gone from the uploaded list.
  - Update hint-copy assertions to match the new "...rotate or resize" text.
  
  Implement the `SvgInputPanel.tsx` change to go green.
- Refactor pass, then re-run the full `web-app` suite.

### 4. Graphify

Run `graphify update .` after implementation.

## Out of scope

- Resizing via the numeric input (removed entirely) or any freeform/edge-only resize handles.
- Snap-to-guide behavior for resize (only drag/rotate snapping exists today; not extended to scale).
- Multi-select resize or per-ring independent resize (group scales as one unit, same as move/rotate).
