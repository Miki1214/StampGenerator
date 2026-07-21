import { beforeAll, describe, expect, it } from "vitest";
import { initManifold } from "../../src/validate/shape-cleaner";
import { buildBasePlate } from "../../src/geometry/base-plate";

describe("buildBasePlate", () => {
  beforeAll(async () => {
    await initManifold();
  });

  it("produces a manifold rectangular prism with the expected X/Y/Z dimensions", () => {
    const canvasSizeMm = 50;
    const thicknessMm = 3;

    const mesh = buildBasePlate(canvasSizeMm, thicknessMm);

    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      xs.push(mesh.vertices[i]);
      ys.push(mesh.vertices[i + 1]);
      zs.push(mesh.vertices[i + 2]);
    }

    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(canvasSizeMm);
    expect(Math.min(...ys)).toBeCloseTo(0);
    expect(Math.max(...ys)).toBeCloseTo(canvasSizeMm);
    expect(Math.min(...zs)).toBeCloseTo(0);
    expect(Math.max(...zs)).toBeCloseTo(thicknessMm);

    // Rectangular prism → 8 corners, 12 triangles.
    expect(mesh.vertices.length / 3).toBe(8);
    expect(mesh.triangleIndices.length / 3).toBe(12);
  });
});
