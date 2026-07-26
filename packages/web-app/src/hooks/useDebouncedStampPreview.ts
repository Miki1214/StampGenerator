import { useEffect, useRef, useState, type RefObject } from "react";
import type { PathShapeSet, StampOptions } from "@stamp-generator/geometry-core";
import type { DrawingCanvasHandle } from "../components/DrawingCanvas";
import type { UseStampPipeline } from "./useStampPipeline";

const PREVIEW_DEBOUNCE_MS = 250;

export interface UseDebouncedStampPreviewArgs {
  options: StampOptions;
  drawingCanvasRef: RefObject<DrawingCanvasHandle | null>;
  pipeline: UseStampPipeline;
}

function optionsContentKey(options: StampOptions): string {
  return JSON.stringify(options);
}

function shapesContentKey(shapes: PathShapeSet): string {
  return JSON.stringify(shapes);
}

/**
 * Debounced live preview: canvas scene changes and options rebuild the full
 * stamp mesh from the current Fabric drawing.
 */
export function useDebouncedStampPreview({
  options,
  drawingCanvasRef,
  pipeline,
}: UseDebouncedStampPreviewArgs): { onSceneChange: () => void } {
  const [sceneEpoch, setSceneEpoch] = useState(0);
  const onSceneChange = () => {
    setSceneEpoch((current) => current + 1);
  };

  const pipelineRef = useRef(pipeline);
  pipelineRef.current = pipeline;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const lastPreviewKeyRef = useRef<string | null>(null);

  const optionsKey = optionsContentKey(options);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void (async () => {
        const currentOptions = optionsRef.current;
        const canvas =
          drawingCanvasRef.current?.getFabricCanvasLike() ?? {
            getObjects: () => [],
          };
        if (canvas.getObjects().length === 0) {
          lastPreviewKeyRef.current = null;
          pipelineRef.current.clearPreview();
          return;
        }

        const shapes = await pipelineRef.current.importFromCanvas(canvas);
        if (!shapes) {
          lastPreviewKeyRef.current = null;
          pipelineRef.current.clearPreview();
          return;
        }

        const previewKey = `${optionsContentKey(currentOptions)}|${shapesContentKey(shapes)}`;
        if (previewKey === lastPreviewKeyRef.current) {
          return;
        }

        const mesh = await pipelineRef.current.rebuildPreview(
          currentOptions,
          shapes,
        );
        if (mesh) {
          lastPreviewKeyRef.current = previewKey;
        }
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
    // optionsKey: content equality — ignore new object identity for same options.
  }, [optionsKey, sceneEpoch, drawingCanvasRef]);

  return { onSceneChange };
}
