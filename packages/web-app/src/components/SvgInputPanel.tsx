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
  onReposition: (placement: SvgPlacementOptions) => void;
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

function placementToPercents(placement: SvgPlacementOptions): {
  sizePercent: number;
  offsetXPercent: number;
  offsetYPercent: number;
} {
  return {
    sizePercent: Math.round(placement.sizeFraction * 100),
    offsetXPercent: Math.round(placement.offsetXFraction * 100),
    offsetYPercent: Math.round(placement.offsetYFraction * 100),
  };
}

function buildPlacement(
  frameUnits: number,
  sizePercent: number,
  offsetXPercent: number,
  offsetYPercent: number,
): SvgPlacementOptions {
  return {
    frameUnits,
    sizeFraction: sizePercent / 100,
    offsetXFraction: offsetXPercent / 100,
    offsetYFraction: offsetYPercent / 100,
  };
}

export function SvgInputPanel({
  onImport,
  onReposition,
  onRemove,
  layers,
  selectedId,
  onSelect,
  frameUnits,
}: SvgInputPanelProps) {
  const [sizePercent, setSizePercent] = useState(DEFAULT_SVG_SIZE_PERCENT);
  const [offsetXPercent, setOffsetXPercent] = useState(0);
  const [offsetYPercent, setOffsetYPercent] = useState(0);

  const selectedLayer = layers.find((layer) => layer.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedLayer) {
      return;
    }
    const percents = placementToPercents(selectedLayer.placement);
    setSizePercent(percents.sizePercent);
    setOffsetXPercent(percents.offsetXPercent);
    setOffsetYPercent(percents.offsetYPercent);
  }, [selectedLayer]);

  const readPlacement = (): SvgPlacementOptions => {
    const size = clampPercent(sizePercent, 5, 100);
    const offsetX = clampPercent(offsetXPercent, -50, 50);
    const offsetY = clampPercent(offsetYPercent, -50, 50);
    setSizePercent(size);
    setOffsetXPercent(offsetX);
    setOffsetYPercent(offsetY);
    return buildPlacement(frameUnits, size, offsetX, offsetY);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className={labelClassName}>
          Position X (%)
          <input
            type="number"
            aria-label="Position X (%)"
            min={-50}
            max={50}
            step={1}
            value={offsetXPercent}
            onChange={(event) =>
              setOffsetXPercent(
                clampPercent(Number(event.target.value), -50, 50),
              )
            }
            className={inputClassName}
          />
          <span className="mt-1 block font-mono text-xs text-slate/70">
            0 = center, − left / + right
          </span>
        </label>
        <label className={labelClassName}>
          Position Y (%)
          <input
            type="number"
            aria-label="Position Y (%)"
            min={-50}
            max={50}
            step={1}
            value={offsetYPercent}
            onChange={(event) =>
              setOffsetYPercent(
                clampPercent(Number(event.target.value), -50, 50),
              )
            }
            className={inputClassName}
          />
          <span className="mt-1 block font-mono text-xs text-slate/70">
            0 = center, − up / + down
          </span>
        </label>
      </div>

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

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => onReposition(readPlacement())}
          className="border border-accent text-accent font-mono text-sm px-6 py-3 rounded hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          Reposition
        </button>
      </div>

      <SvgDropZone onImport={handleDrop} />
    </div>
  );
}
