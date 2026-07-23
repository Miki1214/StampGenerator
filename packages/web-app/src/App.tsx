import { useRef, useState } from "react";
import type {
  StampOptions,
  TextImportRequest,
} from "@stamp-generator/geometry-core";
import { BrandHeader } from "./components/BrandHeader";
import { CollapsibleTextPanel } from "./components/CollapsibleTextPanel";
import { DownloadButton } from "./components/DownloadButton";
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
} from "./components/DrawingCanvas";
import {
  InputModeTabs,
  type InputMode,
} from "./components/InputModeTabs";
import { StampPreview } from "./components/StampPreview";
import { SvgDropZone } from "./components/SvgDropZone";
import { ValidationMessages } from "./components/ValidationMessages";
import { useDebouncedStampPreview } from "./hooks/useDebouncedStampPreview";
import { useStampPipeline } from "./hooks/useStampPipeline";
import { DRAWING_CANVAS_SIZE_PX } from "./lib/drawing-canvas";

const DEFAULT_OPTIONS: StampOptions = {
  designHeightMm: 2,
  canvasSizeUnits: DRAWING_CANVAS_SIZE_PX,
  canvasSizeMm: 50,
  baseShape: "round",
};

/** Keep canvas layout (text + strokes) in stamp-relative positions. */
function withDesignFrame(options: StampOptions): StampOptions {
  return {
    ...options,
    designFrame: {
      minX: 0,
      maxX: options.canvasSizeUnits,
      minY: 0,
      maxY: options.canvasSizeUnits,
    },
  };
}

export function App() {
  const pipeline = useStampPipeline();
  const drawingCanvasRef = useRef<DrawingCanvasHandle>(null);
  const [options, setOptions] = useState<StampOptions>(DEFAULT_OPTIONS);
  const [activeTab, setActiveTab] = useState<InputMode>("draw");

  const drawOptions = withDesignFrame(options);
  const previewOptions = activeTab === "draw" ? drawOptions : options;

  const { onSceneChange } = useDebouncedStampPreview({
    activeTab,
    options: previewOptions,
    drawingCanvasRef,
    pipeline,
  });

  const handleTextImport = (request: TextImportRequest) => {
    void (async () => {
      const shapes = await pipeline.importFromText(request);
      if (!shapes) {
        return;
      }
      // Paint glyphs onto the same Fabric canvas as freehand strokes so both
      // share one design and the live preview matches what you see.
      drawingCanvasRef.current?.addOutlineShapes(shapes);
    })();
  };

  const validationResult =
    pipeline.state.status === "invalid"
      ? { ok: false as const, issues: pipeline.state.issues }
      : pipeline.state.status === "ready" && pipeline.state.warnings?.length
        ? { ok: true as const, warnings: pipeline.state.warnings }
        : { ok: true as const };

  const isPipelineBusy =
    pipeline.state.status === "importing" ||
    pipeline.state.status === "validating";
  const downloadDisabled =
    activeTab === "draw" ? isPipelineBusy : pipeline.state.status !== "ready";

  const handleDownload = async () => {
    if (activeTab === "draw") {
      const shapes = await pipeline.importFromCanvas(
        drawingCanvasRef.current?.getFabricCanvasLike() ?? {
          getObjects: () => [],
        },
      );
      return pipeline.exportStl(drawOptions, shapes ?? undefined);
    }
    return pipeline.exportStl(options);
  };

  return (
    <div className="min-h-screen bg-navy text-slate-light font-sans antialiased flex flex-col">
      <BrandHeader />

      <main className="flex-1 px-6 py-8 sm:px-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          <section id="design">
            <h2 className="font-mono text-sm text-accent mb-4">
              <span className="mr-2">01.</span>Design
            </h2>
            <div className="bg-navy-light rounded-lg p-6 shadow-lg shadow-navy-darkest/40">
              <InputModeTabs active={activeTab} onSelect={setActiveTab} />
              <div className="mt-6">
                {activeTab === "draw" ? (
                  <>
                    <CollapsibleTextPanel
                      onImport={handleTextImport}
                      baseShape={options.baseShape}
                      frameUnits={options.canvasSizeUnits}
                    />
                    <DrawingCanvas
                      ref={drawingCanvasRef}
                      baseShape={options.baseShape}
                      canvasSizeMm={options.canvasSizeMm}
                      onBaseShapeChange={(baseShape) =>
                        setOptions((current) => ({ ...current, baseShape }))
                      }
                      onCanvasSizeChange={(canvasSizeMm) =>
                        setOptions((current) => ({ ...current, canvasSizeMm }))
                      }
                      onSceneChange={onSceneChange}
                    />
                  </>
                ) : null}
                {activeTab === "svg" ? (
                  <SvgDropZone
                    onImport={(svgText) => {
                      const file = new File([svgText], "upload.svg", {
                        type: "image/svg+xml",
                      });
                      void pipeline.importFromSvg(file);
                    }}
                  />
                ) : null}
              </div>
              <ValidationMessages result={validationResult} />
            </div>
          </section>

          <section id="preview">
            <h2 className="font-mono text-sm text-accent mb-4">
              <span className="mr-2">02.</span>Preview
            </h2>
            <div className="bg-navy-light rounded-lg p-6 shadow-lg shadow-navy-darkest/40">
              <StampPreview
                mesh={pipeline.previewMesh}
                status={pipeline.previewStatus}
              />
              <p className="mt-4 font-mono text-xs text-slate" aria-live="polite">
                Preview:{" "}
                <span
                  className={
                    pipeline.previewStatus === "ready"
                      ? "text-accent"
                      : pipeline.previewStatus === "error"
                        ? "text-red-400"
                        : "text-slate-light"
                  }
                >
                  {pipeline.previewStatus}
                </span>
              </p>
            </div>
          </section>
        </div>

        <section id="export" className="mt-10 pt-8 border-t border-slate/15">
          <h2 className="font-mono text-sm text-accent mb-4">
            <span className="mr-2">03.</span>Export
          </h2>
          <div className="bg-navy-light rounded-lg p-6 shadow-lg shadow-navy-darkest/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-sm text-slate leading-relaxed max-w-xl">
                Download a watertight STL ready for 3D printing. The preview
                uses the same full stamp mesh as the download.
              </p>
              <p className="font-mono text-xs text-slate mt-3" aria-live="polite">
                Status:{" "}
                <span
                  className={
                    pipeline.state.status === "ready"
                      ? "text-accent"
                      : pipeline.state.status === "invalid"
                        ? "text-red-400"
                        : "text-slate-light"
                  }
                >
                  {pipeline.state.status}
                </span>
              </p>
            </div>
            <DownloadButton
              state={pipeline.state}
              disabled={downloadDisabled}
              onDownload={handleDownload}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
