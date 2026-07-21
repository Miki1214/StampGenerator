import { getManifold } from "../validate/shape-cleaner";
import { meshFromManifold } from "./mesh-from-manifold";
import type { Mesh } from "./types";

export function unionMeshes(a: Mesh, b: Mesh): Mesh {
  const wasm = getManifold();

  const meshA = new wasm.Mesh({
    numProp: 3,
    vertProperties: a.vertices,
    triVerts: a.triangleIndices,
  });
  const meshB = new wasm.Mesh({
    numProp: 3,
    vertProperties: b.vertices,
    triVerts: b.triangleIndices,
  });

  const solidA = wasm.Manifold.ofMesh(meshA);
  const solidB = wasm.Manifold.ofMesh(meshB);
  try {
    const united = wasm.Manifold.union(solidA, solidB);
    try {
      return meshFromManifold(united.getMesh());
    } finally {
      united.delete();
    }
  } finally {
    solidA.delete();
    solidB.delete();
  }
}
