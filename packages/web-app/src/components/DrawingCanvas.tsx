import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Canvas, Group, PencilBrush, Point, util, type FabricObject } from "fabric";
import type {
  FabricCanvasLike,
  FabricStrokeLike,
  PathShapeSet,
  Point2D,
  StampBaseShape,
} from "@stamp-generator/geometry-core";
import { strokeToOutline } from "../lib/stroke-outline";
import { smoothPolyline } from "../lib/smooth-stroke";
import {
  isFilledOutlineObject,
  outlineShapesToPolygons,
  STAMP_INK_COLOR,
  type StampFabricObject,
} from "../lib/outline-to-fabric";
import {
  ROTATION_SNAP_TOLERANCE_DEG,
  SNAP_TOLERANCE_PX,
  snapAngleToCardinal,
  snapCenterToCanvasMiddle,
} from "../lib/snap-guides";
import {
  DRAWING_CANVAS_SIZE_PX,
  VIEWPORT_FRAME_CLASSNAME,
} from "../lib/drawing-canvas";

export interface AddOutlineShapesOptions {
  /** Tag polygons so a later removeBySvgId can strip this import as a unit. */
  svgId?: string;
}

export interface DrawingCanvasHandle {
  getFabricCanvasLike(): FabricCanvasLike;
  /** Paint cleaned outline shapes (e.g. text glyphs / SVG) onto the canvas. */
  addOutlineShapes(shapes: PathShapeSet, options?: AddOutlineShapesOptions): void;
  /** Remove every polygon tagged with this SVG import id. */
  removeBySvgId(svgId: string): void;
  /** Remove all strokes/outlines and notify live preview. */
  clear(): void;
}

export interface DrawingCanvasProps {
  baseShape: StampBaseShape;
  /** Fired when strokes are added, removed, or modified (for live preview). */
  onSceneChange?: () => void;
}

const BRUSH_WIDTH = 8;
// Drop points that are essentially the same pointer-move sample; keeps
// smoothing below from having to fight against near-duplicate noise.
const BRUSH_DECIMATE_PX = 1.5;
// Freehand strokes shorter than this are deliberate small marks (dots,
// short ticks) rather than jittery long gestures, so leave them untouched.
const SMOOTHING_MIN_POINTS = 6;
const SMOOTHING_ITERATIONS = 3;
const SMOOTHING_FACTOR = 0.4;

const CANVAS_CENTER = {
  x: DRAWING_CANVAS_SIZE_PX / 2,
  y: DRAWING_CANVAS_SIZE_PX / 2,
};

/** Matches the app's accent color so guide lines read as UI chrome, not ink. */
const GUIDE_LINE_COLOR = "#64ffda";
const GUIDE_LINE_DASH = [4, 4];

/** Erases any guide line(s) drawn on the transient overlay layer. */
function clearGuides(canvas: Canvas): void {
  canvas.clearContext(canvas.contextTop);
}

/**
 * Draws a single dashed guide line across the full canvas extent on the
 * transient overlay layer (`contextTop`), which Fabric repaints every frame
 * without affecting canvas objects, the undo stack, or the exported scene.
 */
function drawGuideLine(
  canvas: Canvas,
  orientation: "vertical" | "horizontal",
  position: number,
): void {
  const ctx = canvas.contextTop;
  ctx.save();
  ctx.strokeStyle = GUIDE_LINE_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash(GUIDE_LINE_DASH);
  ctx.beginPath();
  if (orientation === "vertical") {
    ctx.moveTo(position, 0);
    ctx.lineTo(position, DRAWING_CANVAS_SIZE_PX);
  } else {
    ctx.moveTo(0, position);
    ctx.lineTo(DRAWING_CANVAS_SIZE_PX, position);
  }
  ctx.stroke();
  ctx.restore();
}

/** Test-only access to the live Fabric canvas (StrictMode-safe mount). */
export const __drawingCanvasTestHooks = {
  getCanvas(): Canvas | null {
    return activeFabricCanvas;
  },
};

let activeFabricCanvas: Canvas | null = null;

function isStampSvgObject(obj: FabricObject | undefined | null): boolean {
  return Boolean(obj && (obj as StampFabricObject).stampSvgId);
}

function pathPointsInCanvasSpace(obj: FabricObject): Point2D[] {
  const pathObj = obj as FabricObject & {
    path?: unknown[];
    pathOffset?: { x: number; y: number };
  };
  const pathData = pathObj.path;
  if (!Array.isArray(pathData) || pathData.length === 0) {
    return [];
  }

  const matrix = obj.calcTransformMatrix();
  const offsetX = pathObj.pathOffset?.x ?? 0;
  const offsetY = pathObj.pathOffset?.y ?? 0;
  const points: Point2D[] = [];

  for (const segment of pathData) {
    if (!Array.isArray(segment) || segment.length < 3) {
      continue;
    }
    const local = new Point(
      Number(segment[segment.length - 2]) - offsetX,
      Number(segment[segment.length - 1]) - offsetY,
    );
    if (!Number.isFinite(local.x) || !Number.isFinite(local.y)) {
      continue;
    }
    const absolute = util.transformPoint(local, matrix);
    points.push({ x: absolute.x, y: absolute.y });
  }

  return points;
}

function polygonPointsInCanvasSpace(obj: FabricObject): Point2D[] {
  const poly = obj as FabricObject & {
    points?: { x: number; y: number }[];
    pathOffset?: { x: number; y: number };
  };
  if (!Array.isArray(poly.points) || poly.points.length === 0) {
    return [];
  }

  const matrix = obj.calcTransformMatrix();
  const offsetX = poly.pathOffset?.x ?? 0;
  const offsetY = poly.pathOffset?.y ?? 0;
  const points: Point2D[] = [];

  for (const p of poly.points) {
    const local = new Point(p.x - offsetX, p.y - offsetY);
    if (!Number.isFinite(local.x) || !Number.isFinite(local.y)) {
      continue;
    }
    const absolute = util.transformPoint(local, matrix);
    points.push({ x: absolute.x, y: absolute.y });
  }

  return points;
}

function objectPointsInCanvasSpace(obj: FabricObject): Point2D[] {
  const poly = obj as FabricObject & { points?: unknown[] };
  if (Array.isArray(poly.points) && poly.points.length > 0) {
    return polygonPointsInCanvasSpace(obj);
  }
  return pathPointsInCanvasSpace(obj);
}

/**
 * Smooths a freshly-drawn (not yet added-to-canvas) Fabric path in place,
 * before it is rasterized or read for outline generation. Runs on
 * `before:path:created`, so the on-screen stroke and the exported centerline
 * (and therefore the extruded stamp geometry) are both desensitized to
 * mouse/pen jitter, since everything downstream reads from `path.path`.
 */
function smoothFreshFabricPath(path: FabricObject): void {
  const pathObj = path as FabricObject & {
    path?: unknown[];
    strokeWidth?: number;
    _setPath?: (data: unknown, adjustPosition: boolean) => void;
  };
  const pathData = pathObj.path;
  if (
    !Array.isArray(pathData) ||
    pathData.length < SMOOTHING_MIN_POINTS ||
    typeof pathObj._setPath !== "function"
  ) {
    return;
  }

  const rawPoints: Point[] = [];
  for (const segment of pathData) {
    if (!Array.isArray(segment) || segment.length < 3) {
      continue;
    }
    const x = Number(segment[segment.length - 2]);
    const y = Number(segment[segment.length - 1]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      rawPoints.push(new Point(x, y));
    }
  }
  if (rawPoints.length < SMOOTHING_MIN_POINTS) {
    return;
  }

  const smoothed = smoothPolyline(rawPoints, SMOOTHING_ITERATIONS, SMOOTHING_FACTOR);
  const strokeWidth =
    typeof pathObj.strokeWidth === "number" ? pathObj.strokeWidth : BRUSH_WIDTH;
  const smoothPathData = util.getSmoothPathFromPoints(
    smoothed.map((p) => new Point(p.x, p.y)),
    strokeWidth / 1000,
  );
  pathObj._setPath(smoothPathData, true);
}

export function toFabricCanvasLike(canvas: Canvas): FabricCanvasLike {
  return {
    getObjects(): FabricStrokeLike[] {
      return canvas.getObjects().flatMap((obj) => {
        const leaves =
          obj instanceof Group && typeof obj.getObjects === "function"
            ? obj.getObjects()
            : [obj];

        return leaves.flatMap((leaf) => {
          const rawPoints = objectPointsInCanvasSpace(leaf);
          if (rawPoints.length < 2) {
            return [];
          }

          // Filled outline shapes (text glyphs / SVG rings) are already closed rings.
          if (isFilledOutlineObject(leaf)) {
            if (rawPoints.length < 3) {
              return [];
            }
            return [{ type: String(leaf.type ?? "polygon"), points: rawPoints }];
          }

          const strokeWidth =
            typeof (leaf as FabricObject & { strokeWidth?: number }).strokeWidth ===
            "number"
              ? Math.max(
                  (leaf as FabricObject & { strokeWidth: number }).strokeWidth,
                  1,
                )
              : BRUSH_WIDTH;
          const points = strokeToOutline(rawPoints, strokeWidth);
          if (points.length < 4) {
            return [];
          }
          return [{ type: String(leaf.type ?? "path"), points }];
        });
      });
    },
  };
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ baseShape, onSceneChange }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const clearCanvasRef = useRef<(() => void) | null>(null);
  const addOutlineShapesRef = useRef<
    | ((shapes: PathShapeSet, options?: AddOutlineShapesOptions) => void)
    | null
  >(null);
  const removeBySvgIdRef = useRef<((svgId: string) => void) | null>(null);
  const onSceneChangeRef = useRef(onSceneChange);
  onSceneChangeRef.current = onSceneChange;

  useImperativeHandle(ref, () => ({
    getFabricCanvasLike(): FabricCanvasLike {
      const canvas = fabricRef.current;
      if (!canvas) {
        return { getObjects: () => [] };
      }
      return toFabricCanvasLike(canvas);
    },
    addOutlineShapes(shapes: PathShapeSet, options?: AddOutlineShapesOptions): void {
      addOutlineShapesRef.current?.(shapes, options);
    },
    removeBySvgId(svgId: string): void {
      removeBySvgIdRef.current?.(svgId);
    },
    clear(): void {
      clearCanvasRef.current?.();
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Fabric wraps/replaces canvas nodes; own the element so React StrictMode
    // remounts do not leave a disposed canvas behind the React ref.
    container.replaceChildren();
    const canvasEl = document.createElement("canvas");
    canvasEl.setAttribute("aria-label", "Drawing canvas");
    container.appendChild(canvasEl);

    const canvas = new Canvas(canvasEl, {
      isDrawingMode: true,
      width: DRAWING_CANVAS_SIZE_PX,
      height: DRAWING_CANVAS_SIZE_PX,
      backgroundColor: "#ffffff",
    });
    const brush = new PencilBrush(canvas);
    brush.width = BRUSH_WIDTH;
    brush.color = STAMP_INK_COLOR;
    brush.decimate = BRUSH_DECIMATE_PX;
    canvas.freeDrawingBrush = brush;

    fabricRef.current = canvas;
    activeFabricCanvas = canvas;

    const undoStack: FabricObject[] = [];
    const redoStack: FabricObject[] = [];

    const notifySceneChange = () => {
      onSceneChangeRef.current?.();
    };

    const handleBeforePathCreated = (event: { path?: FabricObject }) => {
      if (!event.path) {
        return;
      }
      smoothFreshFabricPath(event.path);
    };
    canvas.on("before:path:created", handleBeforePathCreated);

    const handlePathCreated = (event: { path?: FabricObject }) => {
      if (!event.path) {
        return;
      }
      undoStack.push(event.path);
      redoStack.length = 0;
      notifySceneChange();
    };
    canvas.on("path:created", handlePathCreated);

    const handleObjectModified = () => {
      clearGuides(canvas);
      notifySceneChange();
    };
    canvas.on("object:modified", handleObjectModified);

    const handleObjectMoving = (event: { target?: FabricObject }) => {
      const target = event.target;
      if (!isStampSvgObject(target)) {
        return;
      }
      clearGuides(canvas);
      const center = target.getCenterPoint();
      const snapped = snapCenterToCanvasMiddle(
        center,
        CANVAS_CENTER,
        SNAP_TOLERANCE_PX,
      );
      if (!snapped.snappedX && !snapped.snappedY) {
        return;
      }
      target.setPositionByOrigin(
        new Point(snapped.x, snapped.y),
        "center",
        "center",
      );
      target.setCoords();
      if (snapped.snappedX) {
        drawGuideLine(canvas, "vertical", CANVAS_CENTER.x);
      }
      if (snapped.snappedY) {
        drawGuideLine(canvas, "horizontal", CANVAS_CENTER.y);
      }
    };
    canvas.on("object:moving", handleObjectMoving);

    const handleObjectRotating = (event: { target?: FabricObject }) => {
      const target = event.target;
      if (!isStampSvgObject(target)) {
        return;
      }
      clearGuides(canvas);
      const snapped = snapAngleToCardinal(
        target.angle,
        ROTATION_SNAP_TOLERANCE_DEG,
      );
      if (!snapped.snapped) {
        return;
      }
      target.rotate(snapped.angle);
      const center = target.getCenterPoint();
      const isHorizontal = snapped.angle === 0 || snapped.angle === 180;
      drawGuideLine(
        canvas,
        isHorizontal ? "horizontal" : "vertical",
        isHorizontal ? center.y : center.x,
      );
    };
    canvas.on("object:rotating", handleObjectRotating);

    const handleMouseDownBefore = (event: { e: MouseEvent }) => {
      const { target } = canvas.findTarget(event.e);
      if (isStampSvgObject(target)) {
        canvas.isDrawingMode = false;
        return;
      }
      const active = canvas.getActiveObject();
      if (isStampSvgObject(active)) {
        const pointer = canvas.getScenePoint(event.e);
        const corner = active.findControl(pointer, false);
        if (corner) {
          canvas.isDrawingMode = false;
          return;
        }
        canvas.discardActiveObject();
      }
      canvas.isDrawingMode = true;
    };
    canvas.on("mouse:down:before", handleMouseDownBefore);

    const handleSelectionCleared = () => {
      canvas.isDrawingMode = true;
      clearGuides(canvas);
    };
    canvas.on("selection:cleared", handleSelectionCleared);

    const handleMouseUp = () => {
      clearGuides(canvas);
    };
    canvas.on("mouse:up", handleMouseUp);

    // Drawing mode forces freeDrawingCursor on every move; restore SVG hover
    // cursor after that so the pointer still reads as "movable" over imports.
    const handleMouseMove = (event: { e: MouseEvent }) => {
      if (!canvas.isDrawingMode) {
        return;
      }
      const { target } = canvas.findTarget(event.e);
      if (isStampSvgObject(target)) {
        canvas.setCursor(target.hoverCursor || "move");
      }
    };
    canvas.on("mouse:move", handleMouseMove);

    const handlePointerDownOutside = (event: PointerEvent) => {
      const active = canvas.getActiveObject();
      if (!isStampSvgObject(active)) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (container.contains(target)) {
        return;
      }
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      canvas.isDrawingMode = true;
    };
    document.addEventListener("pointerdown", handlePointerDownOutside);

    const clearCanvas = () => {
      const objects = canvas.getObjects().slice();
      if (objects.length === 0) {
        return;
      }
      for (const object of objects) {
        canvas.remove(object);
      }
      undoStack.length = 0;
      redoStack.length = 0;
      canvas.requestRenderAll();
      notifySceneChange();
    };
    clearCanvasRef.current = clearCanvas;

    addOutlineShapesRef.current = (
      shapes: PathShapeSet,
      options?: AddOutlineShapesOptions,
    ) => {
      const polygons = outlineShapesToPolygons(shapes);
      if (polygons.length === 0) {
        return;
      }

      if (options?.svgId) {
        const group = new Group(polygons, {
          selectable: true,
          evented: true,
          hasBorders: true,
          hasControls: true,
          lockScalingX: false,
          lockScalingY: false,
          lockRotation: false,
          hoverCursor: "move",
          moveCursor: "move",
        });
        (group as StampFabricObject).stampSvgId = options.svgId;
        group.setControlsVisibility({
          tl: false,
          tr: false,
          bl: false,
          br: true,
          ml: false,
          mr: false,
          mt: false,
          mb: false,
          mtr: true,
        });
        canvas.add(group);
        undoStack.push(group);
      } else {
        for (const polygon of polygons) {
          canvas.add(polygon);
          undoStack.push(polygon);
        }
      }
      redoStack.length = 0;
      canvas.requestRenderAll();
      notifySceneChange();
    };

    removeBySvgIdRef.current = (svgId: string) => {
      const tagged = canvas
        .getObjects()
        .filter(
          (object) => (object as StampFabricObject).stampSvgId === svgId,
        );
      if (tagged.length === 0) {
        return;
      }
      for (const object of tagged) {
        canvas.remove(object);
      }
      const keep = (object: FabricObject) =>
        (object as StampFabricObject).stampSvgId !== svgId;
      undoStack.splice(0, undoStack.length, ...undoStack.filter(keep));
      redoStack.splice(0, redoStack.length, ...redoStack.filter(keep));
      canvas.requestRenderAll();
      notifySceneChange();
    };

    const undo = () => {
      const object = undoStack.pop();
      if (!object) {
        return;
      }
      canvas.remove(object);
      redoStack.push(object);
      canvas.requestRenderAll();
      notifySceneChange();
    };

    const redo = () => {
      const object = redoStack.pop();
      if (!object) {
        return;
      }
      canvas.add(object);
      undoStack.push(object);
      canvas.requestRenderAll();
      notifySceneChange();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDownOutside);
      canvas.off("before:path:created", handleBeforePathCreated);
      canvas.off("path:created", handlePathCreated);
      canvas.off("object:modified", handleObjectModified);
      canvas.off("object:moving", handleObjectMoving);
      canvas.off("object:rotating", handleObjectRotating);
      canvas.off("mouse:down:before", handleMouseDownBefore);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("mouse:move", handleMouseMove);
      clearCanvasRef.current = null;
      addOutlineShapesRef.current = null;
      removeBySvgIdRef.current = null;
      canvas.dispose();
      if (activeFabricCanvas === canvas) {
        activeFabricCanvas = null;
      }
      fabricRef.current = null;
      container.replaceChildren();
    };
  }, []);

  return (
    <div className={`${VIEWPORT_FRAME_CLASSNAME} overflow-hidden`}>
      <div
        ref={containerRef}
        className={`h-full w-full overflow-hidden border border-slate/30 bg-white ${
          baseShape === "round" ? "rounded-full" : "rounded"
        }`}
      />
    </div>
  );
},
);
