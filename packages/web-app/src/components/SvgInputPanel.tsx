import type { SvgPlacementOptions } from "@stamp-generator/geometry-core";
import { SvgDropZone, type SvgDropPayload } from "./SvgDropZone";

export interface SvgLayer {
  id: string;
  label: string;
  svgText: string;
  placement: SvgPlacementOptions;
}

export interface SvgImportSettings {
  svgText: string;
  fileName: string;
  placement: SvgPlacementOptions;
}

export interface SvgInputPanelProps {
  onImport: (settings: SvgImportSettings) => void;
  onRemove: (id: string) => void;
  layers: SvgLayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  frameUnits: number;
}

const labelClassName = "block font-mono text-sm text-slate";

/** Default max extent as % of the stamp canvas (centered). */
export const DEFAULT_SVG_SIZE_PERCENT = 40;

function buildPlacement(frameUnits: number): SvgPlacementOptions {
  return {
    frameUnits,
    sizeFraction: DEFAULT_SVG_SIZE_PERCENT / 100,
    offsetXFraction: 0,
    offsetYFraction: 0,
  };
}

export function SvgInputPanel({
  onImport,
  onRemove,
  layers,
  selectedId,
  onSelect,
  frameUnits,
}: SvgInputPanelProps) {
  const handleDrop = (payload: SvgDropPayload) => {
    onImport({
      svgText: payload.svgText,
      fileName: payload.fileName,
      placement: buildPlacement(frameUnits),
    });
  };

  return (
    <div className="space-y-5">
      <p className="font-mono text-xs text-slate/70">
        Click and drag an SVG on the canvas to reposition it; use the handles to
        rotate or resize.
      </p>

      {layers.length > 0 ? (
        <div>
          <p className={labelClassName}>Uploaded SVGs</p>
          <ul
            role="listbox"
            aria-label="Uploaded SVGs"
            className="mt-1.5 divide-y divide-slate/15 rounded border border-slate/30 overflow-hidden"
          >
            {layers.map((layer) => {
              const selected = layer.id === selectedId;
              return (
                <li
                  key={layer.id}
                  className={[
                    "flex items-stretch",
                    selected ? "bg-accent/15" : "hover:bg-navy-darkest/60",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onSelect(layer.id)}
                    className={[
                      "flex min-w-0 flex-1 items-center px-3 py-2 font-mono text-sm text-left transition-colors",
                      selected ? "text-accent" : "text-slate-light",
                    ].join(" ")}
                  >
                    <span className="truncate">{layer.label}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${layer.label}`}
                    onClick={() => onRemove(layer.id)}
                    className="shrink-0 px-3 font-mono text-sm text-slate hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <SvgDropZone onImport={handleDrop} />
    </div>
  );
}
