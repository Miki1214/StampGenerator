export interface SvgDropZoneProps {
  onImport: (svgText: string) => void;
}

export function SvgDropZone({ onImport }: SvgDropZoneProps) {
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
        const reader = new FileReader();
        reader.onload = () => {
          onImport(String(reader.result ?? ""));
        };
        reader.readAsText(file);
      }}
    >
      Drop an SVG file here
    </div>
  );
}
