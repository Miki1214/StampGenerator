import { useState } from "react";

export interface SvgDropZoneProps {
  onImport: (svgText: string) => void;
}

function isSvgFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".svg");
}

export function SvgDropZone({ onImport }: SvgDropZoneProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      role="region"
      aria-label="SVG drop zone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (!file) {
          return;
        }
        if (!isSvgFile(file)) {
          setError("Only .svg files are supported");
          return;
        }
        setError(null);
        const reader = new FileReader();
        reader.onload = () => {
          onImport(String(reader.result ?? ""));
        };
        reader.readAsText(file);
      }}
    >
      Drop an SVG file here
      {error ? <div role="alert">{error}</div> : null}
    </div>
  );
}
