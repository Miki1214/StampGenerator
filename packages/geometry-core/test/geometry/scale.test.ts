import { describe, expect, it } from "vitest";
import type { PathShapeSet } from "../../src/validate/types";
import type { StampOptions } from "../../src/geometry/types";
import { scaleToMm } from "../../src/geometry/scale";

describe("scaleToMm", () => {
  it("maps a known canvas-unit bounding box to the expected millimeter bounding box", () => {
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 50 },
            { x: 0, y: 50 },
          ],
        },
        holes: [],
      },
    ];

    const opts: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 100,
      canvasSizeMm: 250,
    };

    const scaled = scaleToMm(shapes, opts);

    const xs = scaled[0].outer.points.map((p) => p.x);
    const ys = scaled[0].outer.points.map((p) => p.y);

    // scale = 250/100 = 2.5 → [0,100]×[0,50] units → [0,250]×[0,125] mm
    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(250);
    expect(Math.min(...ys)).toBeCloseTo(0);
    expect(Math.max(...ys)).toBeCloseTo(125);
  });
});
