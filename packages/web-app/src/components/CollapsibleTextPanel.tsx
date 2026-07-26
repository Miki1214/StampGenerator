import { useState } from "react";
import type {
  StampBaseShape,
  TextImportRequest,
} from "@stamp-generator/geometry-core";
import { TextInputPanel } from "./TextInputPanel";

export interface CollapsibleTextPanelProps {
  onImport: (request: TextImportRequest) => void;
  baseShape: StampBaseShape;
  frameUnits: number;
}

/** Text tools nested under Draw; collapsed by default to keep the canvas primary. */
export function CollapsibleTextPanel({
  onImport,
  baseShape,
  frameUnits,
}: CollapsibleTextPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate/20 pb-4">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between font-mono text-sm text-slate hover:text-slate-light transition-colors"
      >
        <span>
          <span className="text-accent/80 mr-2">Text</span>
          Add typography to the stamp
        </span>
        <span aria-hidden="true" className="text-accent">
          {expanded ? "−" : "+"}
        </span>
      </button>
      {expanded ? (
        <div className="mt-4">
          <TextInputPanel
            onImport={onImport}
            baseShape={baseShape}
            frameUnits={frameUnits}
          />
        </div>
      ) : null}
    </div>
  );
}
