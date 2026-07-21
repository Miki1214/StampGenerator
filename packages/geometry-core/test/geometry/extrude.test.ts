import { beforeAll, describe, expect, it } from "vitest";
import type { PathShapeSet } from "../../src/validate/types";
import { initManifold } from "../../src/validate/shape-cleaner";
import { extrudeShapes } from "../../src/geometry/extrude";

describe("extrudeShapes", () => {
  beforeAll(async () => {
    await initManifold();
  });

  it("extrudes a square ring into a mesh with eight vertices and Z bounds [0, height]", () => {
    const heightMm = 2;
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
          ],
        },
        holes: [],
      },
    ];

    const mesh = extrudeShapes(shapes, heightMm);

    // A rectangular prism has 8 unique corner vertices.
    expect(mesh.vertices.length / 3).toBe(8);

    const zs: number[] = [];
    for (let i = 2; i < mesh.vertices.length; i += 3) {
      zs.push(mesh.vertices[i]);
    }
    expect(Math.min(...zs)).toBeCloseTo(0);
    expect(Math.max(...zs)).toBeCloseTo(heightMm);
  });
});
