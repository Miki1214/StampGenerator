import type { Point2D, RawPathSet, ShapeImporter } from "./types";

export interface FabricStrokeLike {
  type: string;
  points: Point2D[];
}

export interface FabricCanvasLike {
  getObjects(): FabricStrokeLike[];
}

export class FabricCanvasImporter implements ShapeImporter<FabricCanvasLike> {
  import(source: FabricCanvasLike, _tolerance: number): RawPathSet {
    const rings = source
      .getObjects()
      .filter((obj) => obj.points && obj.points.length > 0)
      .map((obj) => ({
        points: obj.points.map((p) => ({ x: p.x, y: p.y })),
      }));

    return { rings };
  }
}
