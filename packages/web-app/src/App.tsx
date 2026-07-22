import { useState } from "react";
import type { StampOptions } from "@stamp-generator/geometry-core";
import { ConfigPanel } from "./components/ConfigPanel";
import { DownloadButton } from "./components/DownloadButton";
import { DrawingCanvas } from "./components/DrawingCanvas";
import {
  InputModeTabs,
  type InputMode,
} from "./components/InputModeTabs";
import { Sidebar } from "./components/Sidebar";
import { SvgDropZone } from "./components/SvgDropZone";
import { TextInputPanel } from "./components/TextInputPanel";
import { ValidationMessages } from "./components/ValidationMessages";
import { useStampPipeline } from "./hooks/useStampPipeline";
import { DRAWING_CANVAS_SIZE_PX } from "./lib/drawing-canvas";

const DEFAULT_OPTIONS: StampOptions = {
  designHeightMm: 2,
  canvasSizeUnits: DRAWING_CANVAS_SIZE_PX,
  canvasSizeMm: 50,
  baseShape: "square",
};

export function App() {
  const pipeline = useStampPipeline();
  const [options, setOptions] = useState<StampOptions>(DEFAULT_OPTIONS);
  const [activeTab, setActiveTab] = useState<InputMode>("draw");

  const validationResult =
    pipeline.state.status === "invalid"
      ? { ok: false as const, issues: pipeline.state.issues }
      : { ok: true as const };

  return (
    <div className="min-h-screen bg-navy text-slate-light font-sans antialiased">
      <Sidebar />

      <main className="lg:ml-[min(40%,28rem)] px-6 py-12 lg:py-24 max-w-2xl">
        <section id="design" className="scroll-mt-24">
          <h2 className="font-mono text-sm text-accent mb-4">
            <span className="mr-2">01.</span>Design
          </h2>
          <div className="bg-navy-light rounded-lg p-6 shadow-lg shadow-navy-darkest/40">
            <InputModeTabs active={activeTab} onSelect={setActiveTab} />
            <div className="mt-6">
              {activeTab === "draw" ? (
                <DrawingCanvas
                  onImport={pipeline.importFromCanvas}
                  baseShape={options.baseShape}
                  canvasSizeMm={options.canvasSizeMm}
                  onBaseShapeChange={(baseShape) =>
                    setOptions((current) => ({ ...current, baseShape }))
                  }
                  onCanvasSizeChange={(canvasSizeMm) =>
                    setOptions((current) => ({ ...current, canvasSizeMm }))
                  }
                />
              ) : null}
              {activeTab === "svg" ? (
                <SvgDropZone
                  onImport={(svgText) => {
                    const file = new File([svgText], "upload.svg", {
                      type: "image/svg+xml",
                    });
                    pipeline.importFromSvg(file);
                  }}
                />
              ) : null}
              {activeTab === "text" ? (
                <TextInputPanel onImport={pipeline.importFromText} />
              ) : null}
            </div>
          </div>
        </section>

        <section id="configure" className="scroll-mt-24 mt-16">
          <h2 className="font-mono text-sm text-accent mb-4">
            <span className="mr-2">02.</span>Configure
          </h2>
          <div className="bg-navy-light rounded-lg p-6 shadow-lg shadow-navy-darkest/40">
            <ConfigPanel value={options} onChange={setOptions} />
          </div>
        </section>

        <ValidationMessages result={validationResult} />

        <section id="export" className="scroll-mt-24 mt-16">
          <h2 className="font-mono text-sm text-accent mb-4">
            <span className="mr-2">03.</span>Export
          </h2>
          <div className="bg-navy-light rounded-lg p-6 shadow-lg shadow-navy-darkest/40">
            <p className="text-sm text-slate mb-6 leading-relaxed">
              When your design validates, download a watertight STL ready for
              3D printing.
            </p>
            <p className="font-mono text-xs text-slate mb-4" aria-live="polite">
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
            <DownloadButton
              state={pipeline.state}
              onDownload={async () =>
                (await pipeline.exportStl(options)) ?? new Uint8Array()
              }
            />
          </div>
        </section>
      </main>
    </div>
  );
}
