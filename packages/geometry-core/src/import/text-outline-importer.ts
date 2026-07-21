import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opentype, { type Font, type PathCommand } from "opentype.js";
import { flattenCubicBezier } from "./curve-flatten";
import type {
  BundledFontId,
  Point2D,
  RawPathSet,
  ShapeImporter,
  TextImportRequest,
} from "./types";

const FONT_FILES: Record<BundledFontId, string> = {
  sans: "NotoSans-Regular.ttf",
  serif: "NotoSerif-Regular.ttf",
};

const fontsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../assets/fonts",
);

const fontCache = new Map<BundledFontId, Font>();

export class TextOutlineImporter
  implements ShapeImporter<TextImportRequest>
{
  import(source: TextImportRequest, tolerance: number): RawPathSet {
    if (!source.text) {
      return { rings: [] };
    }

    const font = loadFont(source.fontId);
    const rings: RawPathSet["rings"] = [];
    const scale = source.fontSizeMm / font.unitsPerEm;
    let x = 0;
    let previous: ReturnType<Font["charToGlyph"]> | null = null;

    // Manual LTR layout avoids opentype.js GSUB feature gaps on Noto;
    // kerning still comes from the font's own kern/GPOS metrics.
    for (const char of source.text) {
      const glyph = font.charToGlyph(char);
      if (previous) {
        x += font.getKerningValue(previous, glyph) * scale;
      }

      const path = glyph.getPath(x, source.fontSizeMm, source.fontSizeMm);
      rings.push(...commandsToRings(path.commands, tolerance));

      x += (glyph.advanceWidth ?? 0) * scale;
      previous = glyph;
    }

    return { rings };
  }
}

function loadFont(fontId: BundledFontId): Font {
  const cached = fontCache.get(fontId);
  if (cached) {
    return cached;
  }

  const fileName = FONT_FILES[fontId];
  if (!fileName) {
    throw new Error(`Unknown bundled font id: ${String(fontId)}`);
  }

  const buffer = readFileSync(join(fontsDir, fileName));
  const font = opentype.parse(buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ));
  fontCache.set(fontId, font);
  return font;
}

function commandsToRings(
  commands: PathCommand[],
  tolerance: number,
): RawPathSet["rings"] {
  const rings: RawPathSet["rings"] = [];
  let current: Point2D[] = [];
  let cursor: Point2D = { x: 0, y: 0 };

  const flush = () => {
    if (current.length > 0) {
      rings.push({ points: current });
      current = [];
    }
  };

  for (const cmd of commands) {
    if (cmd.type === "M") {
      flush();
      cursor = { x: cmd.x, y: cmd.y };
      current.push({ ...cursor });
    } else if (cmd.type === "L") {
      cursor = { x: cmd.x, y: cmd.y };
      current.push({ ...cursor });
    } else if (cmd.type === "C") {
      const end = { x: cmd.x, y: cmd.y };
      const flattened = flattenCubicBezier(
        cursor,
        { x: cmd.x1, y: cmd.y1 },
        { x: cmd.x2, y: cmd.y2 },
        end,
        tolerance,
      );
      for (let i = 1; i < flattened.length; i++) {
        current.push(flattened[i]);
      }
      cursor = end;
    } else if (cmd.type === "Q") {
      const end = { x: cmd.x, y: cmd.y };
      const c1 = {
        x: cursor.x + (2 / 3) * (cmd.x1 - cursor.x),
        y: cursor.y + (2 / 3) * (cmd.y1 - cursor.y),
      };
      const c2 = {
        x: end.x + (2 / 3) * (cmd.x1 - end.x),
        y: end.y + (2 / 3) * (cmd.y1 - end.y),
      };
      const flattened = flattenCubicBezier(cursor, c1, c2, end, tolerance);
      for (let i = 1; i < flattened.length; i++) {
        current.push(flattened[i]);
      }
      cursor = end;
    } else if (cmd.type === "Z") {
      flush();
    }
  }

  flush();
  return rings;
}
