import { describe, expect, it, vi } from "vitest";
import type { RawPathSet } from "../../src/import/types";
import type { PathShapeSet } from "../../src/validate/types";
import { ShapeValidator } from "../../src/validate/shape-validator";
import * as shapeCleanerModule from "../../src/validate/shape-cleaner";

describe("ShapeValidator", () => {
  it("warns (does not reject) a shape with a feature narrower than minFeatureSizeMm", () => {
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

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings![0].code).toMatch(/feature|narrow|min/i);
    expect(result.warnings![0].severity).toBe("warning");
    expect(result.warnings![0].message).toMatch(/0\.5/);
    expect(result.warnings![0].message).toMatch(/might not be represented/i);
  });

  it("rejects an empty design with an empty-design issue instead of throwing", () => {
    const validator = new ShapeValidator();
    const result = validator.validate([], {
      minFeatureSizeMm: 0.5,
      maxRingCount: 100,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toMatch(/empty/i);
    expect(result.issues[0].message).toMatch(/empty/i);
  });

  it("rejects a RawPathSet exceeding maxRingCount before any cleanup work runs", () => {
    const raw: RawPathSet = {
      rings: Array.from({ length: 4 }, (_, i) => ({
        points: [
          { x: i, y: 0 },
          { x: i + 1, y: 0 },
          { x: i + 1, y: 1 },
          { x: i, y: 1 },
        ],
      })),
    };

    const cleanSpy = vi.spyOn(
      shapeCleanerModule.ShapeCleaner.prototype,
      "clean",
    );
    const validator = new ShapeValidator();
    const result = validator.validateRaw(raw, {
      minFeatureSizeMm: 0.5,
      maxRingCount: 3,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toMatch(/ring|max|count/i);
    expect(result.issues[0].message).toMatch(/3/);
    expect(cleanSpy).not.toHaveBeenCalled();
    cleanSpy.mockRestore();
  });
});
