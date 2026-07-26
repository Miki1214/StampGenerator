import { useState } from "react";
import type {
  BundledFontId,
  StampBaseShape,
  TextImportRequest,
  TextLineAlign,
  TextVerticalAlign,
} from "@stamp-generator/geometry-core";

export interface TextInputPanelProps {
  onImport: (request: TextImportRequest) => void;
  baseShape: StampBaseShape;
  frameUnits: number;
}

const inputClassName =
  "mt-1.5 block w-full rounded bg-navy-darkest border border-slate/30 px-3 py-2 text-lightest-slate font-mono text-sm focus:outline-none focus:border-accent transition-colors";

const labelClassName = "block font-mono text-sm text-slate";

/** Smallest reliably printable letter height offered in the UI. */
export const MIN_TEXT_SIZE_MM = 40;

/** Default copy seeded into the form and pre-imported onto the draw canvas. */
export const DEFAULT_STAMP_TEXT = "Michal Ilczuk Software Development";
export const DEFAULT_STAMP_FONT_ID: BundledFontId = "display";

const FONT_PREVIEW_FAMILY: Record<BundledFontId, string> = {
  sans: "var(--font-stamp-sans)",
  serif: "var(--font-stamp-serif)",
  seal: "var(--font-stamp-seal)",
  script: "var(--font-stamp-script)",
  display: "var(--font-stamp-display)",
};

const FONT_OPTIONS: { id: BundledFontId; label: string }[] = [
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "seal", label: "Seal (Cinzel)" },
  { id: "script", label: "Script (Great Vibes)" },
  { id: "display", label: "Display (Lobster)" },
];

function clampTextSizeMm(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_TEXT_SIZE_MM;
  }
  return Math.max(MIN_TEXT_SIZE_MM, value);
}

export function TextInputPanel({
  onImport,
  baseShape,
  frameUnits,
}: TextInputPanelProps) {
  const [text, setText] = useState(DEFAULT_STAMP_TEXT);
  const [fontId, setFontId] = useState<BundledFontId>(DEFAULT_STAMP_FONT_ID);
  const [fontSizeMm, setFontSizeMm] = useState(MIN_TEXT_SIZE_MM);
  const [verticalAlign, setVerticalAlign] =
    useState<TextVerticalAlign>("border");
  const [lineAlign, setLineAlign] = useState<TextLineAlign>("center");

  const effectiveVerticalAlign: TextVerticalAlign =
    verticalAlign === "border" && baseShape !== "round"
      ? "center"
      : verticalAlign;

  const previewSample = text.trim() || "Aa Bb Cc 123";

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const size = clampTextSizeMm(fontSizeMm);
        setFontSizeMm(size);
        onImport({
          text,
          fontId,
          fontSizeMm: size,
          verticalAlign: effectiveVerticalAlign,
          lineAlign,
          frameUnits,
          baseShape,
        });
      }}
    >
      <label className={labelClassName}>
        Text
        <textarea
          aria-label="Text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          className={inputClassName}
        />
      </label>
      <div>
        <label className={labelClassName}>
          Font
          <select
            aria-label="Font"
            value={fontId}
            onChange={(event) => setFontId(event.target.value as BundledFontId)}
            className={inputClassName}
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p
          aria-label="Font preview"
          className={`mt-2 rounded bg-navy-darkest border border-slate/20 px-3 py-2 text-lightest-slate leading-snug truncate ${
            fontId === "script" ? "text-2xl" : "text-lg"
          }`}
          style={{ fontFamily: FONT_PREVIEW_FAMILY[fontId] }}
        >
          {previewSample}
        </p>
      </div>
      <label className={labelClassName}>
        Size (mm)
        <input
          type="number"
          aria-label="Size (mm)"
          min={MIN_TEXT_SIZE_MM}
          step={1}
          value={fontSizeMm}
          onChange={(event) =>
            setFontSizeMm(clampTextSizeMm(Number(event.target.value)))
          }
          className={inputClassName}
        />
        <span className="mt-1 block font-mono text-xs text-slate/70">
          Minimum {MIN_TEXT_SIZE_MM} mm for reliable printing
        </span>
      </label>
      <label className={labelClassName}>
        Vertical alignment
        <select
          aria-label="Vertical alignment"
          value={effectiveVerticalAlign}
          onChange={(event) =>
            setVerticalAlign(event.target.value as TextVerticalAlign)
          }
          className={inputClassName}
        >
          <option value="center">Center</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="top-down">Top-down</option>
          {baseShape === "round" ? (
            <option value="border">Around the border</option>
          ) : null}
        </select>
      </label>
      <label className={labelClassName}>
        Line alignment
        <select
          aria-label="Line alignment"
          value={lineAlign}
          onChange={(event) =>
            setLineAlign(event.target.value as TextLineAlign)
          }
          className={inputClassName}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
      <button
        type="submit"
        className="border border-accent text-accent font-mono text-sm px-6 py-3 rounded hover:bg-accent/10 transition-colors"
      >
        Add text
      </button>
    </form>
  );
}
