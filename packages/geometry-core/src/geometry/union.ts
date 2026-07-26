import { getManifold } from "../validate/shape-cleaner";
import { meshFromManifold } from "./mesh-from-manifold";
import { meshToManifoldSolid } from "./mesh-to-manifold-solid";
import type { Mesh } from "./types";

export function unionMeshes(a: Mesh, b: Mesh): Mesh {
  const wasm = getManifold();

  const solidA = meshToManifoldSolid(a);
  const solidB = meshToManifoldSolid(b);
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
