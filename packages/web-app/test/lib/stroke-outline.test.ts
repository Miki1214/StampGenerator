import { describe, expect, it } from "vitest";
import { strokeToOutline } from "../../src/lib/stroke-outline";

describe("strokeToOutline", () => {
  it("turns an open centerline into a closed ribbon whose width matches the stroke", () => {
    const centerline = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const width = 10;
    const outline = strokeToOutline(centerline, width);

    expect(outline.length).toBeGreaterThanOrEqual(4);
    const first = outline[0];
    const last = outline[outline.length - 1];
    expect(first.x).toBeCloseTo(last.x);
    expect(first.y).toBeCloseTo(last.y);

    const ys = outline.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(width);
  });

  it("does not collapse a bent stroke into a filled chord between endpoints", () => {
    // An "L"-shaped stroke: the triangle interior (25,25) would be inside a
    // naive close-the-centerline fill, but outside a stroke ribbon.
    const centerline = [
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 50, y: 50 },
    ];
    const outline = strokeToOutline(centerline, 8);

    expect(pointInPolygon({ x: 25, y: 25 }, outline)).toBe(false);
    // On the stroke corridor near the vertical leg.
    expect(pointInPolygon({ x: 0, y: 25 }, outline)).toBe(true);
  });
});

function pointInPolygon(
  point: { x: number; y: number },
  ring: { x: number; y: number }[],
): boolean {
  // Ray casting; ignore duplicate closing vertex if present.
  const n =
    ring.length > 1 &&
    ring[0].x === ring[ring.length - 1].x &&
    ring[0].y === ring[ring.length - 1].y
      ? ring.length - 1
      : ring.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i].x;
    const yi = ring[i].y;
    const xj = ring[j].x;
    const yj = ring[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}
