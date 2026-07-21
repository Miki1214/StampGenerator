import { describe, expect, it } from "vitest";
import { flattenCubicBezier } from "../../src/import/curve-flatten";

describe("flattenCubicBezier", () => {
  it("returns the correct number of points for a degenerate straight-line bezier", () => {
    // Collinear control points: P0=(0,0), P1=(1,0), P2=(2,0), P3=(3,0)
    const points = flattenCubicBezier(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      0.1,
    );

    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("respects the given tolerance by producing more points on a curved segment when tolerance is tighter", () => {
    // Unit square control points: strongly curved cubic
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 0, y: 1 };
    const p2 = { x: 1, y: 1 };
    const p3 = { x: 1, y: 0 };

    const coarse = flattenCubicBezier(p0, p1, p2, p3, 0.5);
    const fine = flattenCubicBezier(p0, p1, p2, p3, 0.01);

    expect(fine.length).toBeGreaterThan(coarse.length);
  });
});
