import { useEffect, useRef } from "react";
import { Canvas, PencilBrush } from "fabric";
import type {
  FabricCanvasLike,
  FabricStrokeLike,
} from "@stamp-generator/geometry-core";

export interface DrawingCanvasProps {
  onImport: (canvas: FabricCanvasLike) => void;
}

function toFabricCanvasLike(canvas: Canvas): FabricCanvasLike {
  return {
    getObjects(): FabricStrokeLike[] {
      return canvas.getObjects().flatMap((obj) => {
        const path = (obj as { path?: unknown }).path;
        if (!Array.isArray(path)) {
          return [];
        }
        const points = path.flatMap((segment: unknown) => {
          if (!Array.isArray(segment) || segment.length < 3) {
            return [];
          }
          // Fabric path commands: ['M', x, y] or ['Q', c1x, c1y, x, y] etc.
          const x = Number(segment[segment.length - 2]);
          const y = Number(segment[segment.length - 1]);
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return [];
          }
          return [{ x, y }];
        });
        if (points.length === 0) {
          return [];
        }
        return [{ type: String(obj.type ?? "path"), points }];
      });
    },
  };
}

export function DrawingCanvas({ onImport }: DrawingCanvasProps) {
  const hostRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }
    const canvas = new Canvas(hostRef.current, {
      isDrawingMode: true,
      width: 400,
      height: 300,
    });
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    fabricRef.current = canvas;
    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  return (
    <div>
      <canvas ref={hostRef} aria-label="Drawing canvas" />
      <button
        type="button"
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
    </div>
  );
}
