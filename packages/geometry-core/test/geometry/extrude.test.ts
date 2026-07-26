import { beforeAll, describe, expect, it } from "vitest";
import type { PathShapeSet } from "../../src/validate/types";
import { initManifold } from "../../src/validate/shape-cleaner";
import type { Mesh } from "../../src/geometry/types";
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

  it("extrudes a square annulus (letter-O) to a mesh whose volume matches the analytic ring volume", () => {
    const heightMm = 2;
    // Outer 10×10 square, inner 6×6 hole → area 100−36 = 64 → volume 128.
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
        holes: [
          {
            points: [
              { x: 2, y: 2 },
              { x: 2, y: 8 },
              { x: 8, y: 8 },
              { x: 8, y: 2 },
            ],
          },
        ],
      },
    ];

    const mesh = extrudeShapes(shapes, heightMm);

    const expectedVolume = (10 * 10 - 6 * 6) * heightMm;
    expect(meshVolume(mesh)).toBeCloseTo(expectedVolume, 5);
  });
});

/** Signed volume of a triangle mesh via the divergence theorem. */
function meshVolume(mesh: Mesh): number {
  let volume = 0;
  const v = mesh.vertices;
  const indices = mesh.triangleIndices;
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;
    const ax = v[i0];
    const ay = v[i0 + 1];
    const az = v[i0 + 2];
    const bx = v[i1];
    const by = v[i1 + 1];
    const bz = v[i1 + 2];
    const cx = v[i2];
    const cy = v[i2 + 1];
    const cz = v[i2 + 2];
    volume +=
      ax * (by * cz - bz * cy) +
      ay * (bz * cx - bx * cz) +
      az * (bx * cy - by * cx);
  }
  return Math.abs(volume / 6);
}
