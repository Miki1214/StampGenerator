import { describe, expect, it } from "vitest";
import { smoothPolyline } from "../../src/lib/smooth-stroke";

describe("smoothPolyline", () => {
  it("leaves the first and last points untouched", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: -4 },
      { x: 30, y: 6 },
      { x: 40, y: 0 },
    ];
    const smoothed = smoothPolyline(points, 3, 0.4);

    expect(smoothed[0]).toEqual(points[0]);
    expect(smoothed[smoothed.length - 1]).toEqual(points[points.length - 1]);
  });

  it("reduces the amplitude of a jittery zig-zag while following its trend", () => {
    const jittery = Array.from({ length: 21 }, (_, i) => ({
      x: i * 5,
      // A rising trend with alternating +/-3 jitter noise on top.
      y: i * 2 + (i % 2 === 0 ? 3 : -3),
    }));

    const smoothed = smoothPolyline(jittery, 4, 0.5);

    const jitterVariance = (points: { x: number; y: number }[]) => {
      let total = 0;
      for (let i = 1; i < points.length - 1; i++) {
        const trend = (points[i - 1].y + points[i + 1].y) / 2;
        total += (points[i].y - trend) ** 2;
      }
      return total / (points.length - 2);
    };

    expect(jitterVariance(smoothed)).toBeLessThan(jitterVariance(jittery) * 0.5);
  });

  it("returns points unchanged when there are fewer than 3 points", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(smoothPolyline(points, 5, 0.5)).toEqual(points);
  });

  it("is a no-op when iterations or factor are zero", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 8 },
      { x: 10, y: 0 },
    ];
    expect(smoothPolyline(points, 0, 0.5)).toEqual(points);
    expect(smoothPolyline(points, 5, 0)).toEqual(points);
  });
});
