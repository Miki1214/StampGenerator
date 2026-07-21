import { useState } from "react";

export interface SvgDropZoneProps {
  onImport: (svgText: string) => void;
}

function isSvgFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".svg");
}

export function SvgDropZone({ onImport }: SvgDropZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      role="region"
      aria-label="SVG drop zone"
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
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
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors",
        isDragging
          ? "border-accent bg-accent/5 text-accent"
          : "border-slate/40 text-slate hover:border-accent hover:text-slate-light",
      ].join(" ")}
    >
      <svg
        aria-hidden="true"
        className="h-10 w-10 opacity-60"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
      <p className="font-mono text-sm">Drop an SVG file here</p>
      {error ? (
        <div role="alert" className="text-red-400 text-xs font-mono">
          {error}
        </div>
      ) : null}
    </div>
  );
}
