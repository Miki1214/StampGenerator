import type { Point2D, RawPathSet, ShapeImporter } from "./types";

export class SvgFileImporter implements ShapeImporter<string> {
  import(source: string, _tolerance: number): RawPathSet {
    const rectMatch = source.match(/<rect\b([^>]*)\/?>/i);
    if (!rectMatch) {
      return { rings: [] };
    }

    const attrs = parseAttributes(rectMatch[1]);
    const x = Number(attrs.x ?? 0);
    const y = Number(attrs.y ?? 0);
    const width = Number(attrs.width ?? 0);
    const height = Number(attrs.height ?? 0);

    const points: Point2D[] = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];

    return { rings: [{ points }] };
  }
}

function parseAttributes(attributeText: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(attributeText)) !== null) {
    attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}
