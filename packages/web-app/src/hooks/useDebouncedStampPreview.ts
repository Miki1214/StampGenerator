import { useEffect, useRef, useState, type RefObject } from "react";
import type { StampOptions } from "@stamp-generator/geometry-core";
import type { DrawingCanvasHandle } from "../components/DrawingCanvas";
import type { UseStampPipeline } from "./useStampPipeline";

const PREVIEW_DEBOUNCE_MS = 250;

export interface UseDebouncedStampPreviewArgs {
  options: StampOptions;
  drawingCanvasRef: RefObject<DrawingCanvasHandle | null>;
  pipeline: UseStampPipeline;
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

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void (async () => {
        const canvas =
          drawingCanvasRef.current?.getFabricCanvasLike() ?? {
            getObjects: () => [],
          };
        if (canvas.getObjects().length === 0) {
          pipelineRef.current.clearPreview();
          return;
        }

        const shapes = await pipelineRef.current.importFromCanvas(canvas);
        if (!shapes) {
          pipelineRef.current.clearPreview();
          return;
        }
        await pipelineRef.current.rebuildPreview(options, shapes);
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [options, sceneEpoch, drawingCanvasRef]);

  return { onSceneChange };
}
