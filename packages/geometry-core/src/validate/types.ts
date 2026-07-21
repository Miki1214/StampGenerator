import type { Point2D, RawPathSet } from "../import/types";

export interface Ring {
  points: Point2D[];
}

export interface PolygonWithHoles {
  outer: Ring;
  holes: Ring[];
}

export type PathShapeSet = PolygonWithHoles[];

export interface ValidationRules {
  minFeatureSizeMm: number;
  maxRingCount: number;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; issues: ValidationIssue[] };

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ShapeCleaner {
  clean(raw: RawPathSet): PathShapeSet;
}

export interface ShapeValidator {
  validate(shapes: PathShapeSet, rules: ValidationRules): ValidationResult;
}
