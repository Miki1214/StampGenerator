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
});
