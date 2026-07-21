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
