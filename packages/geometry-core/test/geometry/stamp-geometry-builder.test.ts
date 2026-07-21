import { beforeAll, describe, expect, it } from "vitest";
import { getManifold, initManifold } from "../../src/validate/shape-cleaner";
import { StampGeometryBuilder } from "../../src/geometry/stamp-geometry-builder";
import type { StampOptions } from "../../src/geometry/types";
import type { PathShapeSet } from "../../src/validate/types";

describe("StampGeometryBuilder", () => {
  beforeAll(async () => {
    await initManifold();
  });

  it("builds a manifold mesh from a simple asymmetric shape", () => {
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 10, y: 10 },
            { x: 40, y: 10 },
            { x: 40, y: 20 },
            { x: 20, y: 20 },
            { x: 20, y: 40 },
            { x: 10, y: 40 },
          ],
        },
        holes: [],
      },
    ];
    const opts: StampOptions = {
      designHeightMm: 2,
      baseThicknessMm: 3,
      canvasSizeUnits: 50,
      canvasSizeMm: 50,
    };

    const builder = new StampGeometryBuilder();
    const mesh = builder.build(shapes, opts);

    const wasm = getManifold();
    const manifoldMesh = new wasm.Mesh({
      numProp: 3,
      vertProperties: mesh.vertices,
      triVerts: mesh.triangleIndices,
    });
    const solid = wasm.Manifold.ofMesh(manifoldMesh);
    try {
      expect(solid.status()).toBe("NoError");
      expect(solid.volume()).toBeGreaterThan(0);
    } finally {
      solid.delete();
    }
  });

  it("mirrors an asymmetric L-shape so the tall stem ends up on the opposite side of the plate", () => {
    // Stem on the LEFT before mirror (x=10–20, y up to 40).
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 10, y: 10 },
            { x: 40, y: 10 },
            { x: 40, y: 20 },
            { x: 20, y: 20 },
            { x: 20, y: 40 },
            { x: 10, y: 40 },
          ],
        },
        holes: [],
      },
    ];
    const opts: StampOptions = {
      designHeightMm: 2,
      baseThicknessMm: 3,
      canvasSizeUnits: 50,
      canvasSizeMm: 50,
    };

    const mesh = new StampGeometryBuilder().build(shapes, opts);

    // Design sits above the base: z ∈ (baseThickness, baseThickness+designHeight].
    const designXy: { x: number; y: number }[] = [];
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const z = mesh.vertices[i + 2];
      if (z > opts.baseThicknessMm + 1e-6) {
        designXy.push({ x: mesh.vertices[i], y: mesh.vertices[i + 1] });
      }
    }

    // After mirror about bbox center X=25: stem moves to x=30–40.
    const tallStemYs = designXy.filter((p) => p.y > 30);
    expect(tallStemYs.length).toBeGreaterThan(0);
    expect(Math.min(...tallStemYs.map((p) => p.x))).toBeGreaterThan(25);
    expect(Math.max(...tallStemYs.map((p) => p.x))).toBeCloseTo(40);

    // Original left stem location must be empty in the design.
    const leftStemGhosts = tallStemYs.filter((p) => p.x < 25);
    expect(leftStemGhosts).toHaveLength(0);
  });
});
