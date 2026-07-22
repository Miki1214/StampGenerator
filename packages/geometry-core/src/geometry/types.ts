import type { PathShapeSet } from "../validate/types";

/** Square stamp canvas sizes offered in the UI (mm). */
export const STAMP_CANVAS_SIZES_MM = [25, 50, 80, 100] as const;

export type StampCanvasSizeMm = (typeof STAMP_CANVAS_SIZES_MM)[number];

export interface StampOptions {
  designHeightMm: number;
  canvasSizeUnits: number;
  canvasSizeMm: number;
}

export interface Mesh {
  vertices: Float32Array;
  triangleIndices: Uint32Array;
}

export interface StampGeometryBuilder {
  build(shapes: PathShapeSet, opts: StampOptions): Mesh;
}
