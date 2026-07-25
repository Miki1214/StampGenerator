import { useEffect, useRef, useState } from "react";
import type {
  StampOptions,
  TextImportRequest,
} from "@stamp-generator/geometry-core";
import { BrandHeader } from "./components/BrandHeader";
import { CollapsibleSvgPanel } from "./components/CollapsibleSvgPanel";
import { CollapsibleTextPanel } from "./components/CollapsibleTextPanel";
import { DownloadButton } from "./components/DownloadButton";
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
} from "./components/DrawingCanvas";
import { StampPreview } from "./components/StampPreview";
import { StampSizeSelector } from "./components/StampSizeSelector";
import type {
  SvgImportSettings,
  SvgLayer,
} from "./components/SvgInputPanel";
import {
  DEFAULT_STAMP_FONT_ID,
  DEFAULT_STAMP_TEXT,
  MIN_TEXT_SIZE_MM,
} from "./components/TextInputPanel";
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

function svgLabelFromFileName(fileName: string): string {
  const base = fileName.replace(/\.svg$/i, "").trim();
  return base.length > 0 ? base : "SVG";
}

function createSvgLayerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `svg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function App() {
  const pipeline = useStampPipeline();
  const drawingCanvasRef = useRef<DrawingCanvasHandle>(null);
  const [options, setOptions] = useState<StampOptions>(DEFAULT_OPTIONS);
  const [svgLayers, setSvgLayers] = useState<SvgLayer[]>([]);
  const [selectedSvgId, setSelectedSvgId] = useState<string | null>(null);

  const drawOptions = withDesignFrame(options);

  const { onSceneChange } = useDebouncedStampPreview({
    options: drawOptions,
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

  const handleSvgImport = (settings: SvgImportSettings) => {
    void (async () => {
      const file = new File(
        [settings.svgText],
        settings.fileName || "upload.svg",
        { type: "image/svg+xml" },
      );
      const shapes = await pipeline.importFromSvg(file, settings.placement);
      if (!shapes) {
        return;
      }
      const id = createSvgLayerId();
      drawingCanvasRef.current?.addOutlineShapes(shapes, { svgId: id });
      setSvgLayers((current) => [
        ...current,
        {
          id,
          label: svgLabelFromFileName(settings.fileName),
          svgText: settings.svgText,
          placement: settings.placement,
        },
      ]);
      setSelectedSvgId(id);
    })();
  };

  const handleSvgRemove = (id: string) => {
    drawingCanvasRef.current?.removeBySvgId(id);
    setSvgLayers((current) => current.filter((entry) => entry.id !== id));
    setSelectedSvgId((current) => (current === id ? null : current));
  };

  const handleClearCanvas = () => {
    drawingCanvasRef.current?.clear();
    setSvgLayers([]);
    setSelectedSvgId(null);
  };

  // Seed the draw canvas once with the default stamp text (StrictMode-safe).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const shapes = await pipeline.importFromText({
        text: DEFAULT_STAMP_TEXT,
        fontId: DEFAULT_STAMP_FONT_ID,
        fontSizeMm: MIN_TEXT_SIZE_MM,
        verticalAlign:
          DEFAULT_OPTIONS.baseShape === "round" ? "border" : "center",
        lineAlign: "center",
        frameUnits: DEFAULT_OPTIONS.canvasSizeUnits,
        baseShape: DEFAULT_OPTIONS.baseShape,
      });
      if (cancelled || !shapes) {
        return;
      }
      drawingCanvasRef.current?.addOutlineShapes(shapes);
    })();
    return () => {
      cancelled = true;
    };
    // Mount-only seed from fixed defaults; pipeline identity is unstable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validationResult =
    pipeline.state.status === "invalid"
      ? { ok: false as const, issues: pipeline.state.issues }
      : pipeline.state.status === "ready" && pipeline.state.warnings?.length
        ? { ok: true as const, warnings: pipeline.state.warnings }
        : { ok: true as const };

  const isPipelineBusy =
    pipeline.state.status === "importing" ||
    pipeline.state.status === "validating";

  const handleDownload = async () => {
    const shapes = await pipeline.importFromCanvas(
      drawingCanvasRef.current?.getFabricCanvasLike() ?? {
        getObjects: () => [],
      },
    );
    return pipeline.exportStl(drawOptions, shapes ?? undefined);
  };

  return (
    <div className="min-h-screen bg-navy text-slate-light font-sans antialiased flex flex-col">
      <BrandHeader />

      <main className="flex-1 px-6 py-8 sm:px-10 max-w-7xl mx-auto w-full">
        <section id="config" aria-label="Stamp configuration">
          <div className="bg-navy-light rounded-lg p-6 shadow-lg shadow-navy-darkest/40 space-y-6">
            <CollapsibleTextPanel
              onImport={handleTextImport}
              baseShape={options.baseShape}
              frameUnits={options.canvasSizeUnits}
            />
            <CollapsibleSvgPanel
              onImport={handleSvgImport}
              onRemove={handleSvgRemove}
              layers={svgLayers}
              selectedId={selectedSvgId}
              onSelect={setSelectedSvgId}
              frameUnits={options.canvasSizeUnits}
            />
            <StampSizeSelector
              baseShape={options.baseShape}
              onBaseShapeChange={(baseShape) =>
                setOptions((current) => ({ ...current, baseShape }))
              }
              canvasSizeMm={options.canvasSizeMm}
              onCanvasSizeChange={(canvasSizeMm) =>
                setOptions((current) => ({ ...current, canvasSizeMm }))
              }
            />
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleClearCanvas}
                className="border border-slate/40 text-slate-light font-mono text-sm px-4 py-2 rounded hover:border-accent hover:text-accent transition-colors"
              >
                Clear canvas
              </button>
            </div>
          </div>
        </section>

        {/*
          2×2 grid: headings share one row, viewports share the next so tops
          stay locked. order-* keeps Design→Preview stacking on mobile.
        */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-x-8 lg:gap-x-10 gap-y-4">
          <h2
            id="design"
            className="order-1 font-mono text-sm text-accent self-end"
          >
            <span className="mr-2">01.</span>Design
          </h2>
          <div className="order-3 lg:order-2 self-end flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <h2
                id="preview"
                className="font-mono text-sm text-accent"
              >
                <span className="mr-2">02.</span>Preview
              </h2>
              <p className="font-mono text-xs text-slate mt-0.5">
                Mirrored as a stamp so the imprint matches the canvas
              </p>
            </div>
            <span className="font-mono text-xs text-slate" aria-live="polite">
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
            </span>
          </div>

          <div className="order-2 lg:order-3 bg-navy-light rounded-lg p-6 shadow-lg shadow-navy-darkest/40">
            <DrawingCanvas
              ref={drawingCanvasRef}
              baseShape={options.baseShape}
              onSceneChange={onSceneChange}
            />
          </div>

          <div className="order-4 bg-navy-light rounded-lg p-6 shadow-lg shadow-navy-darkest/40">
            <StampPreview
              mesh={pipeline.previewMesh}
              status={pipeline.previewStatus}
            />
          </div>
        </div>

        <ValidationMessages result={validationResult} />

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
              disabled={isPipelineBusy}
              onDownload={handleDownload}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
