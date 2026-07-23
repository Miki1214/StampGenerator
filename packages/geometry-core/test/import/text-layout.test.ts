import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseFont } from "opentype.js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  BUNDLED_FONT_FILES,
  setBundledFontDataProvider,
} from "../../src/import/text-outline-importer";
import {
  layoutText,
  splitLines,
  transformLocalPoint,
} from "../../src/import/text-layout";
import type {
  BundledFontId,
  TextImportRequest,
} from "../../src/import/types";

const fontsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../assets/fonts",
);

let sansFont: ReturnType<typeof parseFont>;

beforeAll(() => {
  setBundledFontDataProvider((fontId: BundledFontId) => {
    const buffer = readFileSync(join(fontsDir, BUNDLED_FONT_FILES[fontId]));
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
  });
  const buffer = readFileSync(join(fontsDir, BUNDLED_FONT_FILES.sans));
  sansFont = parseFont(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  );
});

function baseRequest(
  overrides: Partial<TextImportRequest> & Pick<TextImportRequest, "text">,
): TextImportRequest {
  return {
    fontId: "sans",
    fontSizeMm: 10,
    frameUnits: 100,
    baseShape: "round",
    ...overrides,
  };
}

describe("splitLines", () => {
  it("splits on newlines and returns an empty list for empty input", () => {
    expect(splitLines("")).toEqual([]);
    expect(splitLines("a\nb")).toEqual(["a", "b"]);
    expect(splitLines("a\r\nb")).toEqual(["a", "b"]);
  });
});

describe("layoutText", () => {
  it("uses legacy origin-based placement when verticalAlign is omitted", () => {
    const layout = layoutText(
      sansFont,
      baseRequest({ text: "AB" /* no verticalAlign */ }),
    );

    expect(layout.glyphs).toHaveLength(2);
    expect(layout.glyphs[0].placement.x).toBeCloseTo(0);
    expect(layout.glyphs[0].placement.y).toBeCloseTo(10);
    expect(layout.glyphs[0].placement.rotation).toBe(0);
    expect(layout.glyphs[1].placement.x).toBeGreaterThan(0);
  });

  it("anchors a centered block near the middle of the frame", () => {
    const layout = layoutText(
      sansFont,
      baseRequest({ text: "Hi", verticalAlign: "center" }),
    );

    const ys = layout.glyphs.map((g) => g.placement.y);
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
    expect(midY).toBeGreaterThan(30);
    expect(midY).toBeLessThan(70);
  });

  it("places top-aligned text near the top of the frame", () => {
    const layout = layoutText(
      sansFont,
      baseRequest({ text: "Hi", verticalAlign: "top" }),
    );

    const minY = Math.min(...layout.glyphs.map((g) => g.placement.y));
    expect(minY).toBeLessThan(25);
  });

  it("places bottom-aligned text near the bottom of the frame", () => {
    const layout = layoutText(
      sansFont,
      baseRequest({ text: "Hi", verticalAlign: "bottom" }),
    );

    const maxY = Math.max(...layout.glyphs.map((g) => g.placement.y));
    expect(maxY).toBeGreaterThan(75);
  });

  it("stacks top-down letters vertically and ignores newlines", () => {
    const layout = layoutText(
      sansFont,
      baseRequest({ text: "AB\nC", verticalAlign: "top-down" }),
    );

    expect(layout.glyphs.map((g) => g.char).join("")).toBe("ABC");
    expect(layout.glyphs[0].placement.y).toBeLessThan(
      layout.glyphs[1].placement.y,
    );
    expect(layout.glyphs[1].placement.y).toBeLessThan(
      layout.glyphs[2].placement.y,
    );
  });

  it("places border text on a top arc for round stamps", () => {
    const layout = layoutText(
      sansFont,
      baseRequest({
        text: "HELLO",
        verticalAlign: "border",
        baseShape: "round",
        frameUnits: 200,
        fontSizeMm: 12,
      }),
    );

    expect(layout.glyphs.length).toBe(5);
    const cx = 100;
    const cy = 100;
    for (const glyph of layout.glyphs) {
      const dx = glyph.placement.x - cx;
      const dy = glyph.placement.y - cy;
      const r = Math.hypot(dx, dy);
      expect(r).toBeGreaterThan(50);
      // Top-arc glyphs should sit in the upper half of the frame.
      expect(glyph.placement.y).toBeLessThan(cy);
      expect(glyph.placement.rotation).not.toBe(0);
    }
  });

  it("places a second border line on the bottom arc", () => {
    const layout = layoutText(
      sansFont,
      baseRequest({
        text: "TOP\nBOTTOM",
        verticalAlign: "border",
        baseShape: "round",
        frameUnits: 200,
      }),
    );

    expect(layout.glyphs).toHaveLength(9);
    const top = layout.glyphs.slice(0, 3);
    const bottom = layout.glyphs.slice(3);
    expect(top.map((g) => g.char).join("")).toBe("TOP");
    // Bottom keeps LTR character order; angular walk is reversed instead.
    expect(bottom.map((g) => g.char).join("")).toBe("BOTTOM");

    const cy = 100;
    expect(Math.max(...top.map((g) => g.placement.y))).toBeLessThan(cy);
    expect(Math.min(...bottom.map((g) => g.placement.y))).toBeGreaterThan(cy);
  });

  it("places the bottom arc baseline farther out so both lines hug the rim", () => {
    const frameUnits = 400;
    const fontSizeMm = 24;
    const layout = layoutText(
      sansFont,
      baseRequest({
        text: "Kimi Workshop\nKimi Workshop",
        verticalAlign: "border",
        baseShape: "round",
        frameUnits,
        fontSizeMm,
      }),
    );

    const cx = frameUnits / 2;
    const cy = frameUnits / 2;
    const mid = Math.floor(layout.glyphs.length / 2);
    const top = layout.glyphs.slice(0, mid);
    const bottom = layout.glyphs.slice(mid);

    const meanRadius = (glyphs: { placement: { x: number; y: number } }[]) => {
      const total = glyphs.reduce(
        (sum, g) =>
          sum + Math.hypot(g.placement.x - cx, g.placement.y - cy),
        0,
      );
      return total / glyphs.length;
    };

    // Bottom baseline must sit outside the top baseline (closer to the rim)
    // to compensate for tops pointing inward vs outward.
    expect(meanRadius(bottom)).toBeGreaterThan(meanRadius(top) + 5);
  });

  it("spaces border glyphs by advance+kerning without mid-slot gaps", () => {
    const layout = layoutText(
      sansFont,
      baseRequest({
        text: "Kimi Workshop",
        verticalAlign: "border",
        baseShape: "round",
        frameUnits: 400,
        fontSizeMm: 24,
      }),
    );

    // Chord length between consecutive non-space glyph origins should track
    // that pair's advance (plus kerning), not leave ~½-advance holes.
    const scale = 24 / sansFont.unitsPerEm;
    for (let i = 0; i < layout.glyphs.length - 1; i++) {
      const a = layout.glyphs[i];
      const b = layout.glyphs[i + 1];
      if (a.char === " " || b.char === " ") {
        continue;
      }
      const chord = Math.hypot(
        b.placement.x - a.placement.x,
        b.placement.y - a.placement.y,
      );
      const glyphA = sansFont.charToGlyph(a.char);
      const glyphB = sansFont.charToGlyph(b.char);
      const expected =
        a.advance + sansFont.getKerningValue(glyphA, glyphB) * scale;
      // Arc chord ≈ arc length for these small steps.
      expect(chord).toBeGreaterThan(expected * 0.7);
      expect(chord).toBeLessThan(expected * 1.3);
    }
  });

  it("falls back to centered block layout when border is requested on a square stamp", () => {
    const layout = layoutText(
      sansFont,
      baseRequest({
        text: "Hi",
        verticalAlign: "border",
        baseShape: "square",
      }),
    );

    for (const glyph of layout.glyphs) {
      expect(glyph.placement.rotation).toBe(0);
    }
  });

  it("applies lineAlign so a shorter line shifts left or right in the block", () => {
    const left = layoutText(
      sansFont,
      baseRequest({
        text: "WWW\nI",
        verticalAlign: "center",
        lineAlign: "left",
      }),
    );
    const right = layoutText(
      sansFont,
      baseRequest({
        text: "WWW\nI",
        verticalAlign: "center",
        lineAlign: "right",
      }),
    );

    const leftI = left.glyphs.find((g) => g.char === "I")!;
    const rightI = right.glyphs.find((g) => g.char === "I")!;
    expect(rightI.placement.x).toBeGreaterThan(leftI.placement.x);
  });
});

describe("transformLocalPoint", () => {
  it("translates without rotation around the local baseline", () => {
    const result = transformLocalPoint(
      { x: 3, y: 10 },
      { x: 5, y: 20, rotation: 0 },
      10,
    );
    expect(result.x).toBeCloseTo(8);
    expect(result.y).toBeCloseTo(20);
  });

  it("rotates 90 degrees CCW around the baseline origin", () => {
    const result = transformLocalPoint(
      { x: 4, y: 10 },
      { x: 0, y: 0, rotation: Math.PI / 2 },
      10,
    );
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(4);
  });
});
