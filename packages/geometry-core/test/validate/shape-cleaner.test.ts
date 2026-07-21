import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { RawPathSet } from "../../src/import/types";
import { initManifold, ShapeCleaner } from "../../src/validate/shape-cleaner";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function loadFixture(name: string): RawPathSet {
  return JSON.parse(
    readFileSync(join(fixturesDir, name), "utf8"),
  ) as RawPathSet;
}

describe("ShapeCleaner", () => {
  beforeAll(async () => {
    await initManifold();
  });

  it("unions two overlapping rectangle rings into a single outer ring", () => {
    const raw = loadFixture("overlapping-rectangles.json");
    const cleaner = new ShapeCleaner();

    const shapes = cleaner.clean(raw);

    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(0);
    expect(shapes[0].outer.points.length).toBeGreaterThanOrEqual(6);

    const xs = shapes[0].outer.points.map((p) => p.x);
    const ys = shapes[0].outer.points.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(15);
    expect(Math.min(...ys)).toBeCloseTo(0);
    expect(Math.max(...ys)).toBeCloseTo(15);
  });

  it("corrects a clockwise outer ring to counter-clockwise winding", () => {
    const raw = loadFixture("reversed-winding.json");
    const cleaner = new ShapeCleaner();

    const shapes = cleaner.clean(raw);

    expect(shapes).toHaveLength(1);
    expect(signedArea(shapes[0].outer.points)).toBeGreaterThan(0);
  });

  it("treats a fully enclosed ring as a hole rather than a separate island", () => {
    const raw = loadFixture("letter-o-hole.json");
    const cleaner = new ShapeCleaner();

    const shapes = cleaner.clean(raw);

    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(1);
    expect(signedArea(shapes[0].outer.points)).toBeGreaterThan(0);
    expect(signedArea(shapes[0].holes[0].points)).toBeLessThan(0);
  });

  it("cleans a self-intersecting stroke into a simple polygon without self-intersections", () => {
    const raw = loadFixture("self-intersecting-stroke.json");
    const cleaner = new ShapeCleaner();

    const shapes = cleaner.clean(raw);

    expect(shapes.length).toBeGreaterThanOrEqual(1);
    for (const shape of shapes) {
      expect(hasSelfIntersection(shape.outer.points)).toBe(false);
      for (const hole of shape.holes) {
        expect(hasSelfIntersection(hole.points)).toBe(false);
      }
    }
  });
});

/** Positive signed area => counter-clockwise (CCW) winding. */
function signedArea(points: { x: number; y: number }[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

/** True when any pair of non-adjacent edges properly intersects. */
function hasSelfIntersection(points: { x: number; y: number }[]): boolean {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a1 = points[i];
    const a2 = points[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) {
        continue;
      }
      const b1 = points[j];
      const b2 = points[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

function segmentsIntersect(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);
  return o1 !== o2 && o3 !== o4;
}

function orientation(
  p: { x: number; y: number },
  q: { x: number; y: number },
  r: { x: number; y: number },
): number {
  const value = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (value === 0) {
    return 0;
  }
  return value > 0 ? 1 : 2;
}
