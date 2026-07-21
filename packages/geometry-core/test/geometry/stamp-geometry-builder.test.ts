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
});
