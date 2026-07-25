import { useEffect, useState } from "react";
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

const inputClassName =
  "mt-1.5 block w-full rounded bg-navy-darkest border border-slate/30 px-3 py-2 text-lightest-slate font-mono text-sm focus:outline-none focus:border-accent transition-colors";

const labelClassName = "block font-mono text-sm text-slate";

/** Default max extent as % of the stamp canvas (centered). */
export const DEFAULT_SVG_SIZE_PERCENT = 40;

function clampPercent(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function buildPlacement(
  frameUnits: number,
  sizePercent: number,
): SvgPlacementOptions {
  return {
    frameUnits,
    sizeFraction: sizePercent / 100,
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
  const [sizePercent, setSizePercent] = useState(DEFAULT_SVG_SIZE_PERCENT);

  const selectedLayer = layers.find((layer) => layer.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedLayer) {
      return;
    }
    setSizePercent(Math.round(selectedLayer.placement.sizeFraction * 100));
  }, [selectedLayer]);

  const readPlacement = (): SvgPlacementOptions => {
    const size = clampPercent(sizePercent, 5, 100);
    setSizePercent(size);
    return buildPlacement(frameUnits, size);
  };

  const handleDrop = (payload: SvgDropPayload) => {
    onImport({
      svgText: payload.svgText,
      fileName: payload.fileName,
      placement: readPlacement(),
    });
  };

  return (
    <div className="space-y-5">
      <label className={labelClassName}>
        Size (% of stamp)
        <input
          type="number"
          aria-label="Size (% of stamp)"
          min={5}
          max={100}
          step={1}
          value={sizePercent}
          onChange={(event) =>
            setSizePercent(clampPercent(Number(event.target.value), 5, 100))
          }
          className={inputClassName}
        />
        <span className="mt-1 block font-mono text-xs text-slate/70">
          Max width or height relative to the canvas
        </span>
      </label>

      <p className="font-mono text-xs text-slate/70">
        Click and drag an SVG on the canvas to reposition it; use the handle to
        rotate.
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
                      "flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2 font-mono text-sm text-left transition-colors",
                      selected ? "text-accent" : "text-slate-light",
                    ].join(" ")}
                  >
                    <span className="truncate">{layer.label}</span>
                    <span className="shrink-0 text-xs text-slate/70">
                      {Math.round(layer.placement.sizeFraction * 100)}%
                    </span>
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
