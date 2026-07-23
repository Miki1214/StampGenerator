import { parse as parseFont, type Font, type PathCommand } from "opentype.js";
import { flattenCubicBezier } from "./curve-flatten";
import { layoutText, transformLocalPoint } from "./text-layout";
import type {
  BundledFontId,
  Point2D,
  RawPathSet,
  ShapeImporter,
  TextImportRequest,
} from "./types";

export const BUNDLED_FONT_FILES: Record<BundledFontId, string> = {
  sans: "NotoSans-Regular.ttf",
  serif: "NotoSerif-Regular.ttf",
  /** Formal engraved / wax-seal capitals (Cinzel). */
  seal: "Cinzel-Regular.ttf",
  /** Elegant calligraphy for seals (Great Vibes). */
  script: "GreatVibes-Regular.ttf",
  /** Bold display script popular on stamps & labels (Lobster). */
  display: "Lobster-Regular.ttf",
};

export type BundledFontDataProvider = (fontId: BundledFontId) => ArrayBuffer;

const fontCache = new Map<BundledFontId, Font>();
let fontDataProvider: BundledFontDataProvider | null = null;

/** Inject font bytes (Node tests use fs; the browser uses fetch). */
export function setBundledFontDataProvider(
  provider: BundledFontDataProvider,
): void {
  fontDataProvider = provider;
  fontCache.clear();
}

export class TextOutlineImporter
  implements ShapeImporter<TextImportRequest>
{
  import(source: TextImportRequest, tolerance: number): RawPathSet {
    if (!source.text) {
      return { rings: [] };
    }

    const font = loadFont(source.fontId);
    const layout = layoutText(font, source);
    const rings: RawPathSet["rings"] = [];

    for (const laidOut of layout.glyphs) {
      const glyph = font.charToGlyph(laidOut.char);
      const path = glyph.getPath(0, layout.baselineY, source.fontSizeMm);
      const localRings = commandsToRings(path.commands, tolerance);
      for (const ring of localRings) {
        rings.push({
          points: ring.points.map((point) =>
            transformLocalPoint(point, laidOut.placement, layout.baselineY),
          ),
        });
      }
    }

    return { rings };
  }
}

function loadFont(fontId: BundledFontId): Font {
  const cached = fontCache.get(fontId);
  if (cached) {
    return cached;
  }

  if (!fontDataProvider) {
    throw new Error(
      "Bundled font data provider is not set; call setBundledFontDataProvider first",
    );
  }

  if (!(fontId in BUNDLED_FONT_FILES)) {
    throw new Error(`Unknown bundled font id: ${String(fontId)}`);
  }

  const font = parseFont(fontDataProvider(fontId));
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
    }
    current = [];
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
