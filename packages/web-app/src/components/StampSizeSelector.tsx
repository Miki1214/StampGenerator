import {
  STAMP_CANVAS_SIZES_MM,
  STAMP_ROUND_DIAMETERS_MM,
  type StampBaseShape,
  type StampCanvasSizeMm,
  type StampRoundDiameterMm,
} from "@stamp-generator/geometry-core";

export interface StampSizeSelectorProps {
  baseShape: StampBaseShape;
  onBaseShapeChange: (shape: StampBaseShape) => void;
  canvasSizeMm: number;
  onCanvasSizeChange: (sizeMm: number) => void;
}

const labelClassName = "block font-mono text-sm text-slate";

const radioLabelClassName =
  "inline-flex cursor-pointer items-center gap-2 font-mono text-sm text-slate-light";

export function StampSizeSelector({
  baseShape,
  onBaseShapeChange,
  canvasSizeMm,
  onCanvasSizeChange,
}: StampSizeSelectorProps) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className={labelClassName}>Base shape</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className={radioLabelClassName}>
            <input
              type="radio"
              name="stamp-base-shape"
              value="round"
              checked={baseShape === "round"}
              onChange={() => onBaseShapeChange("round")}
              className="accent-accent"
            />
            Round
          </label>
          <label className={radioLabelClassName}>
            <input
              type="radio"
              name="stamp-base-shape"
              value="square"
              checked={baseShape === "square"}
              onChange={() => onBaseShapeChange("square")}
              className="accent-accent"
            />
            Square
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelClassName}>
          {baseShape === "square" ? "Stamp size (mm)" : "Stamp diameter (mm)"}
        </legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {baseShape === "square"
            ? STAMP_CANVAS_SIZES_MM.map((sizeMm) => (
                <label key={sizeMm} className={radioLabelClassName}>
                  <input
                    type="radio"
                    name="stamp-size-mm"
                    value={sizeMm}
                    checked={canvasSizeMm === sizeMm}
                    onChange={() =>
                      onCanvasSizeChange(sizeMm as StampCanvasSizeMm)
                    }
                    className="accent-accent"
                  />
                  {sizeMm}×{sizeMm}
                </label>
              ))
            : STAMP_ROUND_DIAMETERS_MM.map((diameterMm) => (
                <label key={diameterMm} className={radioLabelClassName}>
                  <input
                    type="radio"
                    name="stamp-diameter-mm"
                    value={diameterMm}
                    checked={canvasSizeMm === diameterMm}
                    onChange={() =>
                      onCanvasSizeChange(diameterMm as StampRoundDiameterMm)
                    }
                    className="accent-accent"
                  />
                  Ø{diameterMm}
                </label>
              ))}
        </div>
      </fieldset>
    </div>
  );
}
