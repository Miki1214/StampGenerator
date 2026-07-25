import { useState } from "react";
import {
  SvgInputPanel,
  type SvgImportSettings,
} from "./SvgInputPanel";

export interface CollapsibleSvgPanelProps {
  onImport: (settings: SvgImportSettings) => void;
  frameUnits: number;
}

/** SVG tools nested under Draw; collapsed by default to keep the canvas primary. */
export function CollapsibleSvgPanel({
  onImport,
  frameUnits,
}: CollapsibleSvgPanelProps) {
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
          <span className="text-accent/80 mr-2">SVG</span>
          Add vector artwork to the stamp
        </span>
        <span aria-hidden="true" className="text-accent">
          {expanded ? "−" : "+"}
        </span>
      </button>
      {expanded ? (
        <div className="mt-4">
          <SvgInputPanel onImport={onImport} frameUnits={frameUnits} />
        </div>
      ) : null}
    </div>
  );
}
