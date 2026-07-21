import { describe, expect, it } from "vitest";
import { flattenArc, flattenCubicBezier } from "../../src/import/curve-flatten";

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

describe("flattenArc", () => {
  it("flattens a quarter-circle arc into points that stay within tolerance of the true arc", () => {
    const center = { x: 0, y: 0 };
    const radius = 10;
    const startAngle = 0;
    const endAngle = Math.PI / 2;
    const tolerance = 0.1;

    const points = flattenArc(center, radius, startAngle, endAngle, tolerance);

    expect(points.length).toBeGreaterThanOrEqual(2);
    expect(points[0]).toEqual({
      x: radius * Math.cos(startAngle),
      y: radius * Math.sin(startAngle),
    });
    expect(points[points.length - 1].x).toBeCloseTo(
      radius * Math.cos(endAngle),
      10,
    );
    expect(points[points.length - 1].y).toBeCloseTo(
      radius * Math.sin(endAngle),
      10,
    );

    for (const point of points) {
      const distanceFromCenter = Math.hypot(
        point.x - center.x,
        point.y - center.y,
      );
      expect(Math.abs(distanceFromCenter - radius)).toBeLessThanOrEqual(
        tolerance,
      );
    }

    // Chord midpoints must also stay within tolerance of the true arc
    for (let i = 0; i < points.length - 1; i++) {
      const mid = {
        x: (points[i].x + points[i + 1].x) / 2,
        y: (points[i].y + points[i + 1].y) / 2,
      };
      const midRadius = Math.hypot(mid.x - center.x, mid.y - center.y);
      expect(Math.abs(midRadius - radius)).toBeLessThanOrEqual(tolerance);
    }
  });
});
