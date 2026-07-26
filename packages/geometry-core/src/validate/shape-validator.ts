import type { Point2D, RawPathSet } from "../import/types";
import type {
  PathShapeSet,
  ShapeValidator as ShapeValidatorContract,
  ValidationIssue,
  ValidationResult,
  ValidationRules,
} from "./types";

export class ShapeValidator implements ShapeValidatorContract {
  validateRaw(raw: RawPathSet, rules: ValidationRules): ValidationResult {
    if (raw.rings.length > rules.maxRingCount) {
      return {
        ok: false,
        issues: [
          {
            code: "MAX_RING_COUNT_EXCEEDED",
            message: `Design has ${raw.rings.length} rings, which exceeds the maximum of ${rules.maxRingCount}`,
          },
        ],
      };
    }
    return { ok: true };
  }

  validate(shapes: PathShapeSet, rules: ValidationRules): ValidationResult {
    if (shapes.length === 0) {
      return {
        ok: false,
        issues: [
          {
            code: "EMPTY_DESIGN",
            message: "Design is empty — add at least one shape",
          },
        ],
      };
    }

    const warnings: ValidationIssue[] = [];

    for (const shape of shapes) {
      const minDimension = minAabbDimension(shape.outer.points);
      if (minDimension < rules.minFeatureSizeMm) {
        warnings.push({
          code: "FEATURE_TOO_NARROW",
          severity: "warning",
          message: `A feature is narrower than the minimum size of ${rules.minFeatureSizeMm}mm — it might not be represented correctly`,
        });
      }
    }

    return warnings.length > 0 ? { ok: true, warnings } : { ok: true };
  }
}

function minAabbDimension(points: Point2D[]): number {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return Math.min(width, height);
}
