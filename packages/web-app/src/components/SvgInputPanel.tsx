import { useState } from "react";
import type { SvgPlacementOptions } from "@stamp-generator/geometry-core";
import { SvgDropZone } from "./SvgDropZone";

export interface SvgImportSettings {
  svgText: string;
  placement: SvgPlacementOptions;
}

export interface SvgInputPanelProps {
  onImport: (settings: SvgImportSettings) => void;
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

export function SvgInputPanel({ onImport, frameUnits }: SvgInputPanelProps) {
  const [sizePercent, setSizePercent] = useState(DEFAULT_SVG_SIZE_PERCENT);
  const [offsetXPercent, setOffsetXPercent] = useState(0);
  const [offsetYPercent, setOffsetYPercent] = useState(0);

  const handleImport = (svgText: string) => {
    const size = clampPercent(sizePercent, 5, 100);
    const offsetX = clampPercent(offsetXPercent, -50, 50);
    const offsetY = clampPercent(offsetYPercent, -50, 50);
    setSizePercent(size);
    setOffsetXPercent(offsetX);
    setOffsetYPercent(offsetY);
    onImport({
      svgText,
      placement: {
        frameUnits,
        sizeFraction: size / 100,
        offsetXFraction: offsetX / 100,
        offsetYFraction: offsetY / 100,
      },
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
      <SvgDropZone onImport={handleImport} />
    </div>
  );
}
