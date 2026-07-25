import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Canvas, PencilBrush, Point, util, type FabricObject } from "fabric";
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
} from "../lib/outline-to-fabric";
import {
  DRAWING_CANVAS_SIZE_PX,
  VIEWPORT_FRAME_CLASSNAME,
} from "../lib/drawing-canvas";

export interface DrawingCanvasHandle {
  getFabricCanvasLike(): FabricCanvasLike;
  /** Paint cleaned outline shapes (e.g. text glyphs) onto the canvas. */
  addOutlineShapes(shapes: PathShapeSet): void;
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

/** Test-only access to the live Fabric canvas (StrictMode-safe mount). */
export const __drawingCanvasTestHooks = {
  getCanvas(): Canvas | null {
    return activeFabricCanvas;
  },
};

let activeFabricCanvas: Canvas | null = null;

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
        const rawPoints = objectPointsInCanvasSpace(obj);
        if (rawPoints.length < 2) {
          return [];
        }

        // Filled outline shapes (text glyphs) are already closed rings.
        if (isFilledOutlineObject(obj)) {
          if (rawPoints.length < 3) {
            return [];
          }
          return [{ type: String(obj.type ?? "polygon"), points: rawPoints }];
        }

        const strokeWidth =
          typeof (obj as FabricObject & { strokeWidth?: number }).strokeWidth ===
          "number"
            ? Math.max(
                (obj as FabricObject & { strokeWidth: number }).strokeWidth,
                1,
              )
            : BRUSH_WIDTH;
        const points = strokeToOutline(rawPoints, strokeWidth);
        if (points.length < 4) {
          return [];
        }
        return [{ type: String(obj.type ?? "path"), points }];
      });
    },
  };
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ baseShape, onSceneChange }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const clearCanvasRef = useRef<(() => void) | null>(null);
  const addOutlineShapesRef = useRef<((shapes: PathShapeSet) => void) | null>(
    null,
  );
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
    addOutlineShapes(shapes: PathShapeSet): void {
      addOutlineShapesRef.current?.(shapes);
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
      notifySceneChange();
    };
    canvas.on("object:modified", handleObjectModified);

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

    addOutlineShapesRef.current = (shapes: PathShapeSet) => {
      const polygons = outlineShapesToPolygons(shapes);
      if (polygons.length === 0) {
        return;
      }
      for (const polygon of polygons) {
        canvas.add(polygon);
        undoStack.push(polygon);
      }
      redoStack.length = 0;
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
      canvas.off("before:path:created", handleBeforePathCreated);
      canvas.off("path:created", handlePathCreated);
      canvas.off("object:modified", handleObjectModified);
      clearCanvasRef.current = null;
      addOutlineShapesRef.current = null;
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
