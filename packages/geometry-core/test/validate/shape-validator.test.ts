import { describe, expect, it } from "vitest";
import type { PathShapeSet } from "../../src/validate/types";
import { ShapeValidator } from "../../src/validate/shape-validator";

describe("ShapeValidator", () => {
  it("rejects a shape with a feature narrower than minFeatureSizeMm with a descriptive issue", () => {
    // A 0.2mm-wide rectangle — narrower than the 0.5mm minimum feature size.
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 0.2 },
            { x: 0, y: 0.2 },
          ],
        },
        holes: [],
      },
    ];

    const validator = new ShapeValidator();
    const result = validator.validate(shapes, {
      minFeatureSizeMm: 0.5,
      maxRingCount: 100,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues.length).toBeGreaterThanOrEqual(1);
    expect(result.issues[0].code).toMatch(/feature|narrow|min/i);
    expect(result.issues[0].message.length).toBeGreaterThan(0);
    expect(result.issues[0].message).toMatch(/0\.5/);
  });
});
