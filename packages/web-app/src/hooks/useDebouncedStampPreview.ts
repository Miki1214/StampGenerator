import { useEffect, useRef, useState, type RefObject } from "react";
import type { StampOptions } from "@stamp-generator/geometry-core";
import type { DrawingCanvasHandle } from "../components/DrawingCanvas";
import type { InputMode } from "../components/InputModeTabs";
import type { UseStampPipeline } from "./useStampPipeline";

const PREVIEW_DEBOUNCE_MS = 250;

export interface UseDebouncedStampPreviewArgs {
  activeTab: InputMode;
  options: StampOptions;
  drawingCanvasRef: RefObject<DrawingCanvasHandle | null>;
  pipeline: UseStampPipeline;
}

/**
 * Debounced live preview: draw-mode scene changes and options rebuild the full
 * stamp mesh; SVG rebuild when pipeline reaches ready or options change.
 */
export function useDebouncedStampPreview({
  activeTab,
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

  const readyShapes =
    pipeline.state.status === "ready" ? pipeline.state.shapes : null;

  useEffect(() => {
    if (activeTab !== "draw") {
      return;
    }

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
  }, [activeTab, options, sceneEpoch, drawingCanvasRef]);

  useEffect(() => {
    if (activeTab === "draw") {
      return;
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        if (!readyShapes) {
          pipelineRef.current.clearPreview();
          return;
        }
        await pipelineRef.current.rebuildPreview(options, readyShapes);
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [activeTab, options, readyShapes]);

  return { onSceneChange };
}
