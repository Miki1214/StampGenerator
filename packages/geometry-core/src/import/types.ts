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
