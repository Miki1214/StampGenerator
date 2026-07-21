import { useState } from "react";
import type {
  BundledFontId,
  TextImportRequest,
} from "@stamp-generator/geometry-core";

export interface TextInputPanelProps {
  onImport: (request: TextImportRequest) => void;
}

const inputClassName =
  "mt-1.5 block w-full rounded bg-navy-darkest border border-slate/30 px-3 py-2 text-lightest-slate font-mono text-sm focus:outline-none focus:border-accent transition-colors";

const labelClassName = "block font-mono text-sm text-slate";

export function TextInputPanel({ onImport }: TextInputPanelProps) {
  const [text, setText] = useState("");
  const [fontId, setFontId] = useState<BundledFontId>("sans");
  const [fontSizeMm, setFontSizeMm] = useState(10);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onImport({ text, fontId, fontSizeMm });
      }}
    >
      <label className={labelClassName}>
        Text
        <input
          aria-label="Text"
          value={text}
          onChange={(event) => setText(event.target.value)}
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
      <button
        type="submit"
        className="border border-accent text-accent font-mono text-sm px-6 py-3 rounded hover:bg-accent/10 transition-colors"
      >
        Import text
      </button>
    </form>
  );
}
