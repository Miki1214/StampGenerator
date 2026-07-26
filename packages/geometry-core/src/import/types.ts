export interface Point2D {
  x: number;
  y: number;
}

export interface RawRing {
  points: Point2D[];
}

export interface RawPathSet {
  rings: RawRing[];
}

export interface ShapeImporter<TSource> {
  import(source: TSource, tolerance: number): RawPathSet;
}

export type BundledFontId =
  | "sans"
  | "serif"
  | "seal"
  | "script"
  | "display";

export type TextVerticalAlign =
  | "center"
  | "top"
  | "bottom"
  | "top-down"
  | "border";

export type TextLineAlign = "left" | "center" | "right";

export interface TextImportRequest {
  /** May contain `\n` for multiple lines. */
  text: string;
  fontId: BundledFontId;
  fontSizeMm: number;
  /** Defaults to `"center"`. */
  verticalAlign?: TextVerticalAlign;
  /** Defaults to `"center"`. How shorter lines sit relative to the widest. */
  lineAlign?: TextLineAlign;
  /**
   * Canvas-unit square the text lays out within (e.g. 400, matching
   * `StampOptions.canvasSizeUnits`). Required for frame-relative placement.
   */
  frameUnits: number;
  /** Needed for border-mode radius; importer no-ops border on square. */
  baseShape: "square" | "round";
}
