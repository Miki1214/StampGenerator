import { beforeAll, describe, expect, it } from "vitest";
import { initManifold } from "../../src/validate/shape-cleaner";
import { buildBasePlate } from "../../src/geometry/base-plate";
import { extrudeShapes } from "../../src/geometry/extrude";
import { unionMeshes } from "../../src/geometry/union";
import type { Mesh } from "../../src/geometry/types";
import type { PathShapeSet } from "../../src/validate/types";

describe("unionMeshes", () => {
  beforeAll(async () => {
    await initManifold();
  });

  it("unions a design solid fully above a base plate into a mesh whose volume equals the sum of both volumes", () => {
    const base = buildBasePlate(20, 3);
    // Design square sitting in XY on the plate footprint, extruded to height 2.
    // Translate it in Z so it rests exactly on top of the base (z = 3..5).
    const designShapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 5, y: 5 },
            { x: 15, y: 5 },
            { x: 15, y: 15 },
            { x: 5, y: 15 },
          ],
        },
        holes: [],
      },
    ];
    const design = translateMeshZ(extrudeShapes(designShapes, 2), 3);

    const united = unionMeshes(base, design);

    const expectedVolume = meshVolume(base) + meshVolume(design);
    expect(meshVolume(united)).toBeCloseTo(expectedVolume, 5);
  });
});

function translateMeshZ(mesh: Mesh, dz: number): Mesh {
  const vertices = new Float32Array(mesh.vertices);
  for (let i = 2; i < vertices.length; i += 3) {
    vertices[i] += dz;
  }
  return {
    vertices,
    triangleIndices: new Uint32Array(mesh.triangleIndices),
  };
}

function meshVolume(mesh: Mesh): number {
  let volume = 0;
  const v = mesh.vertices;
  const indices = mesh.triangleIndices;
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;
    volume +=
      v[i0] * (v[i1 + 1] * v[i2 + 2] - v[i1 + 2] * v[i2 + 1]) +
      v[i0 + 1] * (v[i1 + 2] * v[i2] - v[i1] * v[i2 + 2]) +
      v[i0 + 2] * (v[i1] * v[i2 + 1] - v[i1 + 1] * v[i2]);
  }
  return Math.abs(volume / 6);
}
