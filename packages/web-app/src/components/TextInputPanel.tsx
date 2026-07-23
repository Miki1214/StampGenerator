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

export function TextInputPanel({
  onImport,
  baseShape,
  frameUnits,
}: TextInputPanelProps) {
  const [text, setText] = useState("");
  const [fontId, setFontId] = useState<BundledFontId>("sans");
  const [fontSizeMm, setFontSizeMm] = useState(10);
  const [verticalAlign, setVerticalAlign] =
    useState<TextVerticalAlign>("center");
  const [lineAlign, setLineAlign] = useState<TextLineAlign>("center");

  const effectiveVerticalAlign: TextVerticalAlign =
    verticalAlign === "border" && baseShape !== "round"
      ? "center"
      : verticalAlign;

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onImport({
          text,
          fontId,
          fontSizeMm,
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
      <label className={labelClassName}>
        Font
        <select
          aria-label="Font"
          value={fontId}
          onChange={(event) => setFontId(event.target.value as BundledFontId)}
          className={inputClassName}
        >
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
        </select>
      </label>
      <label className={labelClassName}>
        Size (mm)
        <input
          type="number"
          aria-label="Size (mm)"
          value={fontSizeMm}
          onChange={(event) => setFontSizeMm(Number(event.target.value))}
          className={inputClassName}
        />
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
        Import text
      </button>
    </form>
  );
}
