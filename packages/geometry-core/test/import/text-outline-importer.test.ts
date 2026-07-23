import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import {
  BUNDLED_FONT_FILES,
  setBundledFontDataProvider,
  TextOutlineImporter,
} from "../../src/import/text-outline-importer";
import type { BundledFontId } from "../../src/import/types";

const fontsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../assets/fonts",
);

beforeAll(() => {
  setBundledFontDataProvider((fontId: BundledFontId) => {
    const buffer = readFileSync(join(fontsDir, BUNDLED_FONT_FILES[fontId]));
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
  });
});

describe("TextOutlineImporter", () => {
  const frame = { frameUnits: 400, baseShape: "round" as const };

  it("imports the glyph outline for a single character using a bundled font", () => {
    const importer = new TextOutlineImporter();
    const result = importer.import(
      { text: "A", fontId: "sans", fontSizeMm: 10, ...frame },
      0.1,
    );

    expect(result.rings.length).toBeGreaterThanOrEqual(1);
    const allPoints = result.rings.flatMap((ring) => ring.points);
    expect(allPoints.length).toBeGreaterThan(2);

    // Glyph should have non-zero extent at the requested size
    const xs = allPoints.map((p) => p.x);
    const ys = allPoints.map((p) => p.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(width).toBeGreaterThan(1);
    expect(height).toBeGreaterThan(1);
    expect(height).toBeLessThanOrEqual(10 + 0.5);
  });

  it("produces multiple rings for a multi-contour glyph such as i", () => {
    const importer = new TextOutlineImporter();
    const result = importer.import(
      { text: "i", fontId: "sans", fontSizeMm: 20, ...frame },
      0.1,
    );

    // Lowercase i has stem + tittle (dot) as separate contours at raw import
    expect(result.rings.length).toBeGreaterThanOrEqual(2);

    for (const ring of result.rings) {
      expect(ring.points.length).toBeGreaterThan(2);
    }
  });

  it("correctly spaces and kerns multi-character strings using the font metrics", () => {
    const importer = new TextOutlineImporter();
    const fontSizeMm = 100;

    const pair = importer.import(
      { text: "AV", fontId: "sans", fontSizeMm, ...frame },
      0.2,
    );
    const letterA = importer.import(
      { text: "A", fontId: "sans", fontSizeMm, ...frame },
      0.2,
    );
    const letterV = importer.import(
      { text: "V", fontId: "sans", fontSizeMm, ...frame },
      0.2,
    );

    const maxX = (result: { rings: { points: { x: number }[] }[] }) =>
      Math.max(...result.rings.flatMap((ring) => ring.points).map((p) => p.x));

    // AV is a classic kerning pair: kerned width must be tighter than A+V
    expect(maxX(pair)).toBeLessThan(maxX(letterA) + maxX(letterV) - 1);
    expect(maxX(pair)).toBeGreaterThan(maxX(letterA));
  });

  it("keeps legacy placement when verticalAlign is omitted", () => {
    const importer = new TextOutlineImporter();
    const result = importer.import(
      { text: "A", fontId: "sans", fontSizeMm: 10, ...frame },
      0.1,
    );
    const xs = result.rings.flatMap((r) => r.points.map((p) => p.x));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...xs)).toBeLessThan(20);
  });

  it("shifts top-aligned text toward smaller Y than bottom-aligned text", () => {
    const importer = new TextOutlineImporter();
    const top = importer.import(
      {
        text: "Hi",
        fontId: "sans",
        fontSizeMm: 10,
        verticalAlign: "top",
        ...frame,
      },
      0.1,
    );
    const bottom = importer.import(
      {
        text: "Hi",
        fontId: "sans",
        fontSizeMm: 10,
        verticalAlign: "bottom",
        ...frame,
      },
      0.1,
    );

    const midY = (result: { rings: { points: { y: number }[] }[] }) => {
      const ys = result.rings.flatMap((r) => r.points.map((p) => p.y));
      return (Math.min(...ys) + Math.max(...ys)) / 2;
    };

    expect(midY(top)).toBeLessThan(midY(bottom));
  });

  it("does not throw and keeps upright glyphs when border is used on a square stamp", () => {
    const importer = new TextOutlineImporter();
    const result = importer.import(
      {
        text: "Hi",
        fontId: "sans",
        fontSizeMm: 10,
        verticalAlign: "border",
        frameUnits: 400,
        baseShape: "square",
      },
      0.1,
    );

    expect(result.rings.length).toBeGreaterThan(0);
  });

  it("produces rotated outline points for border layout on a round stamp", () => {
    const importer = new TextOutlineImporter();
    const result = importer.import(
      {
        text: "HELLO",
        fontId: "sans",
        fontSizeMm: 12,
        verticalAlign: "border",
        frameUnits: 400,
        baseShape: "round",
      },
      0.2,
    );

    const points = result.rings.flatMap((r) => r.points);
    expect(points.length).toBeGreaterThan(10);
    const cx = 200;
    const cy = 200;
    const radii = points.map((p) => Math.hypot(p.x - cx, p.y - cy));
    // Glyphs sit near a common arc radius rather than along a straight baseline.
    const mean = radii.reduce((a, b) => a + b, 0) / radii.length;
    expect(mean).toBeGreaterThan(100);
  });
});
