import {
  STAMP_CANVAS_SIZES_MM,
  type StampCanvasSizeMm,
} from "@stamp-generator/geometry-core";

export interface StampSizeSelectorProps {
  value: number;
  onChange: (sizeMm: StampCanvasSizeMm) => void;
}

const labelClassName = "block font-mono text-sm text-slate";

export function StampSizeSelector({ value, onChange }: StampSizeSelectorProps) {
  return (
    <fieldset>
      <legend className={labelClassName}>Stamp size (mm)</legend>
      <div className="mt-2 flex flex-wrap gap-3">
        {STAMP_CANVAS_SIZES_MM.map((sizeMm) => (
          <label
            key={sizeMm}
            className="inline-flex cursor-pointer items-center gap-2 font-mono text-sm text-slate-light"
          >
            <input
              type="radio"
              name="stamp-size-mm"
              value={sizeMm}
              checked={value === sizeMm}
              onChange={() => onChange(sizeMm)}
              className="accent-accent"
            />
            {sizeMm}×{sizeMm}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
