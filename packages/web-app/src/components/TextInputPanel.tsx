import { useState } from "react";
import type {
  BundledFontId,
  TextImportRequest,
} from "@stamp-generator/geometry-core";

export interface TextInputPanelProps {
  onImport: (request: TextImportRequest) => void;
}

export function TextInputPanel({ onImport }: TextInputPanelProps) {
  const [text, setText] = useState("");
  const [fontId, setFontId] = useState<BundledFontId>("sans");
  const [fontSizeMm, setFontSizeMm] = useState(10);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onImport({ text, fontId, fontSizeMm });
      }}
    >
      <label>
        Text
        <input
          aria-label="Text"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <label>
        Font
        <select
          aria-label="Font"
          value={fontId}
          onChange={(event) => setFontId(event.target.value as BundledFontId)}
        >
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
        </select>
      </label>
      <label>
        Size (mm)
        <input
          type="number"
          aria-label="Size (mm)"
          value={fontSizeMm}
          onChange={(event) => setFontSizeMm(Number(event.target.value))}
        />
      </label>
      <button type="submit">Import text</button>
    </form>
  );
}
