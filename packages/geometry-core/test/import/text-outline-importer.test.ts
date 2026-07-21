import { describe, expect, it } from "vitest";
import { TextOutlineImporter } from "../../src/import/text-outline-importer";

describe("TextOutlineImporter", () => {
  it("imports the glyph outline for a single character using a bundled font", () => {
    const importer = new TextOutlineImporter();
    const result = importer.import(
      { text: "A", fontId: "sans", fontSizeMm: 10 },
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
      { text: "i", fontId: "sans", fontSizeMm: 20 },
      0.1,
    );

    // Lowercase i has stem + tittle (dot) as separate contours at raw import
    expect(result.rings.length).toBeGreaterThanOrEqual(2);

    for (const ring of result.rings) {
      expect(ring.points.length).toBeGreaterThan(2);
    }
  });
});
