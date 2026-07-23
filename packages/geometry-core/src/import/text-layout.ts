import type { Font } from "opentype.js";
import type {
  Point2D,
  TextImportRequest,
  TextLineAlign,
  TextVerticalAlign,
} from "./types";

/** Per-glyph placement in canvas units (y increases downward). */
export interface GlyphPlacement {
  /** Translation applied after rotation around the local baseline origin. */
  x: number;
  y: number;
  /** Rotation in radians, CCW, around (0, baselineY) in local glyph space. */
  rotation: number;
}

export interface LaidOutGlyph {
  char: string;
  /** Advance width used for spacing/kerning (font units × scale). */
  advance: number;
  placement: GlyphPlacement;
}

export interface TextLayoutResult {
  glyphs: LaidOutGlyph[];
  /** Baseline Y used when building local glyph paths via opentype getPath. */
  baselineY: number;
}

const FRAME_MARGIN_RATIO = 0.06;

/**
 * Lay out characters for a text import request. When `verticalAlign` is
 * omitted, returns a legacy origin-based LTR placement (x advances from 0,
 * baseline at fontSizeMm) so existing single-line imports stay unchanged.
 */
export function layoutText(
  font: Font,
  source: TextImportRequest,
): TextLayoutResult {
  const baselineY = source.fontSizeMm;
  const scale = source.fontSizeMm / font.unitsPerEm;
  const lineAlign: TextLineAlign = source.lineAlign ?? "center";

  // Omit verticalAlign → keep the historical origin-based path.
  if (source.verticalAlign === undefined) {
    return layoutLegacy(font, source.text, scale, baselineY);
  }

  const align: TextVerticalAlign = source.verticalAlign;

  if (align === "top-down") {
    return layoutTopDown(font, source, scale, baselineY);
  }

  if (align === "border") {
    if (source.baseShape !== "round") {
      return layoutBlock(font, source, scale, baselineY, "center", lineAlign);
    }
    return layoutBorder(font, source, scale, baselineY);
  }

  return layoutBlock(font, source, scale, baselineY, align, lineAlign);
}

function layoutLegacy(
  font: Font,
  text: string,
  scale: number,
  baselineY: number,
): TextLayoutResult {
  const glyphs: LaidOutGlyph[] = [];
  let x = 0;
  let previous: ReturnType<Font["charToGlyph"]> | null = null;

  for (const char of text) {
    if (char === "\n") {
      continue;
    }
    const glyph = font.charToGlyph(char);
    if (previous) {
      x += font.getKerningValue(previous, glyph) * scale;
    }
    const advance = (glyph.advanceWidth ?? 0) * scale;
    glyphs.push({
      char,
      advance,
      placement: { x, y: baselineY, rotation: 0 },
    });
    x += advance;
    previous = glyph;
  }

  return { glyphs, baselineY };
}

function layoutBlock(
  font: Font,
  source: TextImportRequest,
  scale: number,
  baselineY: number,
  verticalAlign: "center" | "top" | "bottom",
  lineAlign: TextLineAlign,
): TextLayoutResult {
  const lines = splitLines(source.text);
  const lineMetrics = lines.map((line) => measureLine(font, line, scale));
  const pitch = linePitch(font, scale);
  const blockWidth = Math.max(0, ...lineMetrics.map((m) => m.width));
  const blockHeight = lines.length === 0 ? 0 : pitch * lines.length;

  const margin = source.frameUnits * FRAME_MARGIN_RATIO;
  const frameInner = source.frameUnits - 2 * margin;

  const blockOriginX = margin + (frameInner - blockWidth) / 2;
  let blockOriginY: number;
  if (verticalAlign === "top") {
    blockOriginY = margin;
  } else if (verticalAlign === "bottom") {
    blockOriginY = margin + frameInner - blockHeight;
  } else {
    blockOriginY = margin + (frameInner - blockHeight) / 2;
  }

  const glyphs: LaidOutGlyph[] = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const metrics = lineMetrics[lineIndex];
    const lineOffsetX = lineAlignOffset(lineAlign, blockWidth, metrics.width);
    const lineBaselineY = blockOriginY + pitch * (lineIndex + 0.85);

    let x = blockOriginX + lineOffsetX;
    let previous: ReturnType<Font["charToGlyph"]> | null = null;
    for (const char of lines[lineIndex]) {
      const glyph = font.charToGlyph(char);
      if (previous) {
        x += font.getKerningValue(previous, glyph) * scale;
      }
      const advance = (glyph.advanceWidth ?? 0) * scale;
      glyphs.push({
        char,
        advance,
        placement: {
          x,
          y: lineBaselineY,
          rotation: 0,
        },
      });
      x += advance;
      previous = glyph;
    }
  }

  return { glyphs, baselineY };
}

function layoutTopDown(
  font: Font,
  source: TextImportRequest,
  scale: number,
  baselineY: number,
): TextLayoutResult {
  const chars = [...source.text.replace(/\n/g, "")];
  if (chars.length === 0) {
    return { glyphs: [], baselineY };
  }

  const pitch = linePitch(font, scale);
  const columnHeight = pitch * chars.length;
  const columnWidth = Math.max(
    ...chars.map((char) => (font.charToGlyph(char).advanceWidth ?? 0) * scale),
    source.fontSizeMm * 0.5,
  );

  const margin = source.frameUnits * FRAME_MARGIN_RATIO;
  const frameInner = source.frameUnits - 2 * margin;
  const originX = margin + (frameInner - columnWidth) / 2;
  const originY = margin + (frameInner - columnHeight) / 2;

  const glyphs: LaidOutGlyph[] = [];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const glyph = font.charToGlyph(char);
    const advance = (glyph.advanceWidth ?? 0) * scale;
    const charX = originX + (columnWidth - advance) / 2;
    const charBaselineY = originY + pitch * (i + 0.85);
    glyphs.push({
      char,
      advance,
      placement: { x: charX, y: charBaselineY, rotation: 0 },
    });
  }

  return { glyphs, baselineY };
}

function layoutBorder(
  font: Font,
  source: TextImportRequest,
  scale: number,
  baselineY: number,
): TextLayoutResult {
  const lines = splitLines(source.text).slice(0, 2);
  const margin = source.frameUnits * FRAME_MARGIN_RATIO;
  const cx = source.frameUnits / 2;
  const cy = source.frameUnits / 2;
  const radius = Math.max(
    source.frameUnits / 2 - margin - source.fontSizeMm * 0.6,
    source.fontSizeMm,
  );

  const glyphs: LaidOutGlyph[] = [];

  if (lines.length >= 1 && lines[0].length > 0) {
    glyphs.push(
      ...placeOnArc({
        font,
        text: lines[0],
        scale,
        cx,
        cy,
        radius,
        midAngle: -Math.PI / 2,
        reverse: false,
        extraRotation: 0,
      }),
    );
  }

  if (lines.length >= 2 && lines[1].length > 0) {
    glyphs.push(
      ...placeOnArc({
        font,
        text: lines[1],
        scale,
        cx,
        cy,
        radius,
        midAngle: Math.PI / 2,
        reverse: true,
        extraRotation: Math.PI,
      }),
    );
  }

  return { glyphs, baselineY };
}

function placeOnArc(args: {
  font: Font;
  text: string;
  scale: number;
  cx: number;
  cy: number;
  radius: number;
  midAngle: number;
  reverse: boolean;
  extraRotation: number;
}): LaidOutGlyph[] {
  const { font, text, scale, cx, cy, radius, midAngle, reverse, extraRotation } =
    args;

  const measured = measureLine(font, text, scale);
  if (measured.width <= 0 || measured.chars.length === 0) {
    return [];
  }

  const sweep = measured.width / radius;
  let angle = midAngle - sweep / 2;

  const chars = reverse ? [...measured.chars].reverse() : measured.chars;
  const advances = reverse
    ? chars.map((char) => (font.charToGlyph(char).advanceWidth ?? 0) * scale)
    : measured.advances;

  const glyphs: LaidOutGlyph[] = [];
  for (let i = 0; i < chars.length; i++) {
    const advance = advances[i];
    const half = advance / (2 * radius);
    const glyphAngle = angle + half;
    const rotation = glyphAngle + Math.PI / 2 + extraRotation;
    glyphs.push({
      char: chars[i],
      advance,
      placement: {
        x: cx + radius * Math.cos(glyphAngle),
        y: cy + radius * Math.sin(glyphAngle),
        rotation,
      },
    });
    angle += advance / radius;
  }

  return glyphs;
}

/**
 * Apply a glyph placement to a point from a local-space outline built with
 * `getPath(0, baselineY, fontSize)`.
 */
export function transformLocalPoint(
  point: Point2D,
  placement: GlyphPlacement,
  baselineY: number,
): Point2D {
  const lx = point.x;
  const ly = point.y - baselineY;
  const cos = Math.cos(placement.rotation);
  const sin = Math.sin(placement.rotation);
  return {
    x: placement.x + lx * cos - ly * sin,
    y: placement.y + lx * sin + ly * cos,
  };
}

export function splitLines(text: string): string[] {
  if (!text) {
    return [];
  }
  return text.split(/\r?\n/);
}

function measureLine(
  font: Font,
  line: string,
  scale: number,
): { width: number; chars: string[]; advances: number[] } {
  const chars = [...line];
  const advances: number[] = [];
  let width = 0;
  let previous: ReturnType<Font["charToGlyph"]> | null = null;

  for (const char of chars) {
    const glyph = font.charToGlyph(char);
    if (previous) {
      width += font.getKerningValue(previous, glyph) * scale;
    }
    const advance = (glyph.advanceWidth ?? 0) * scale;
    advances.push(advance);
    width += advance;
    previous = glyph;
  }

  return { width, chars, advances };
}

function linePitch(font: Font, scale: number): number {
  const ascender = font.ascender * scale;
  const descender = Math.abs(font.descender * scale);
  const raw = ascender + descender;
  return raw > 0 ? raw * 1.1 : scale * font.unitsPerEm * 1.2;
}

function lineAlignOffset(
  align: TextLineAlign,
  blockWidth: number,
  lineWidth: number,
): number {
  if (align === "left") {
    return 0;
  }
  if (align === "right") {
    return blockWidth - lineWidth;
  }
  return (blockWidth - lineWidth) / 2;
}
