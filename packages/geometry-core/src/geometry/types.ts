export interface StampOptions {
  designHeightMm: number;
  baseThicknessMm: number;
  canvasSizeUnits: number;
  canvasSizeMm: number;
}

export interface Mesh {
  vertices: Float32Array;
  triangleIndices: Uint32Array;
}
