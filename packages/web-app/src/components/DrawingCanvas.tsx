import { useEffect, useRef } from "react";
import { Canvas, PencilBrush, Point, util, type FabricObject } from "fabric";
import type {
  FabricCanvasLike,
  FabricStrokeLike,
  Point2D,
} from "@stamp-generator/geometry-core";
import { strokeToOutline } from "../lib/stroke-outline";
import { DRAWING_CANVAS_SIZE_PX } from "../lib/drawing-canvas";
import { StampSizeSelector } from "./StampSizeSelector";
import type { StampBaseShape } from "@stamp-generator/geometry-core";

export interface DrawingCanvasProps {
  onImport: (canvas: FabricCanvasLike) => void;
  baseShape: StampBaseShape;
  canvasSizeMm: number;
  onBaseShapeChange: (shape: StampBaseShape) => void;
  onCanvasSizeChange: (sizeMm: number) => void;
}

const BRUSH_WIDTH = 8;

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

export function toFabricCanvasLike(canvas: Canvas): FabricCanvasLike {
  return {
    getObjects(): FabricStrokeLike[] {
      return canvas.getObjects().flatMap((obj) => {
        const centerline = pathPointsInCanvasSpace(obj);
        if (centerline.length < 2) {
          return [];
        }
        const strokeWidth =
          typeof (obj as FabricObject & { strokeWidth?: number }).strokeWidth ===
          "number"
            ? Math.max(
                (obj as FabricObject & { strokeWidth: number }).strokeWidth,
                1,
              )
            : BRUSH_WIDTH;
        const points = strokeToOutline(centerline, strokeWidth);
        if (points.length < 4) {
          return [];
        }
        return [{ type: String(obj.type ?? "path"), points }];
      });
    },
  };
}

export function DrawingCanvas({
  onImport,
  baseShape,
  canvasSizeMm,
  onBaseShapeChange,
  onCanvasSizeChange,
}: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);

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
    brush.color = "#0a192f";
    canvas.freeDrawingBrush = brush;

    fabricRef.current = canvas;
    activeFabricCanvas = canvas;

    const undoStack: FabricObject[] = [];
    const redoStack: FabricObject[] = [];

    const handlePathCreated = (event: { path?: FabricObject }) => {
      if (!event.path) {
        return;
      }
      undoStack.push(event.path);
      redoStack.length = 0;
    };
    canvas.on("path:created", handlePathCreated);

    const undo = () => {
      const object = undoStack.pop();
      if (!object) {
        return;
      }
      canvas.remove(object);
      redoStack.push(object);
      canvas.requestRenderAll();
    };

    const redo = () => {
      const object = redoStack.pop();
      if (!object) {
        return;
      }
      canvas.add(object);
      undoStack.push(object);
      canvas.requestRenderAll();
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
      canvas.off("path:created", handlePathCreated);
      canvas.dispose();
      if (activeFabricCanvas === canvas) {
        activeFabricCanvas = null;
      }
      fabricRef.current = null;
      container.replaceChildren();
    };
  }, []);

  return (
    <div className="space-y-4">
      <StampSizeSelector
        baseShape={baseShape}
        onBaseShapeChange={onBaseShapeChange}
        canvasSizeMm={canvasSizeMm}
        onCanvasSizeChange={onCanvasSizeChange}
      />
      <div
        ref={containerRef}
        className={`inline-block overflow-hidden border border-slate/30 bg-white ${
          baseShape === "round" ? "rounded-full" : "rounded"
        }`}
      />
      <div>
        <button
          type="button"
          className="border border-accent text-accent font-mono text-sm px-6 py-3 rounded hover:bg-accent/10 transition-colors"
          onClick={() => {
            const canvas = fabricRef.current;
            if (!canvas) {
              onImport({ getObjects: () => [] });
              return;
            }
            onImport(toFabricCanvasLike(canvas));
          }}
        >
          Import drawing
        </button>
        <p className="mt-2 font-mono text-xs text-slate">
          Draw on the canvas, then import to enable STL download.
        </p>
      </div>
    </div>
  );
}
