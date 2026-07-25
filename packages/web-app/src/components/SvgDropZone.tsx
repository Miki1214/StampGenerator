import { useRef, useState } from "react";

export interface SvgDropPayload {
  svgText: string;
  fileName: string;
}

export interface SvgDropZoneProps {
  onImport: (payload: SvgDropPayload) => void;
}

function isSvgFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".svg");
}

function readSvgFile(
  file: File,
  onImport: (payload: SvgDropPayload) => void,
  setError: (message: string | null) => void,
): void {
  if (!isSvgFile(file)) {
    setError("Only .svg files are supported");
    return;
  }
  setError(null);
  const reader = new FileReader();
  reader.onload = () => {
    onImport({
      svgText: String(reader.result ?? ""),
      fileName: file.name,
    });
  };
  reader.readAsText(file);
}

export function SvgDropZone({ onImport }: SvgDropZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      role="region"
      aria-label="SVG drop zone"
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          fileInputRef.current?.click();
        }
      }}
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
        readSvgFile(file, onImport, setError);
      }}
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer",
        isDragging
          ? "border-accent bg-accent/5 text-accent"
          : "border-slate/40 text-slate hover:border-accent hover:text-slate-light",
      ].join(" ")}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        aria-label="Choose SVG file"
        className="sr-only"
        onClick={(event) => {
          // Keep the zone click from double-firing when the input is activated.
          event.stopPropagation();
        }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }
          readSvgFile(file, onImport, setError);
          // Allow selecting the same file again later.
          event.target.value = "";
        }}
      />
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
      <p className="font-mono text-sm">
        Drop an SVG file here, or click to browse
      </p>
      {error ? (
        <div role="alert" className="text-red-400 text-xs font-mono">
          {error}
        </div>
      ) : null}
    </div>
  );
}
