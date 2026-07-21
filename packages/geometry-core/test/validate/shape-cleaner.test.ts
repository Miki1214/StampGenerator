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
});
