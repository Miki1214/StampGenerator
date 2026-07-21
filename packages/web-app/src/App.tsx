import { useState } from "react";
import type { StampOptions } from "@stamp-generator/geometry-core";
import { ConfigPanel } from "./components/ConfigPanel";
import { DownloadButton } from "./components/DownloadButton";
import { DrawingCanvas } from "./components/DrawingCanvas";
import { SvgDropZone } from "./components/SvgDropZone";
import { TextInputPanel } from "./components/TextInputPanel";
import { ValidationMessages } from "./components/ValidationMessages";
import { useStampPipeline } from "./hooks/useStampPipeline";

const DEFAULT_OPTIONS: StampOptions = {
  designHeightMm: 2,
  baseThicknessMm: 3,
  canvasSizeUnits: 100,
  canvasSizeMm: 50,
};

export function App() {
  const pipeline = useStampPipeline();
  const [options, setOptions] = useState<StampOptions>(DEFAULT_OPTIONS);

  const validationResult =
    pipeline.state.status === "invalid"
      ? { ok: false as const, issues: pipeline.state.issues }
      : { ok: true as const };

  return (
    <main>
      <h1>Stamp Generator</h1>

      <ConfigPanel value={options} onChange={setOptions} />

      <DrawingCanvas onImport={pipeline.importFromCanvas} />

      <SvgDropZone
        onImport={(svgText) => {
          const file = new File([svgText], "upload.svg", {
            type: "image/svg+xml",
          });
          pipeline.importFromSvg(file);
        }}
      />

      <TextInputPanel onImport={pipeline.importFromText} />

      <ValidationMessages result={validationResult} />

      <DownloadButton
        state={pipeline.state}
        onDownload={() => pipeline.exportStl(options) ?? new Uint8Array()}
      />
    </main>
  );
}
