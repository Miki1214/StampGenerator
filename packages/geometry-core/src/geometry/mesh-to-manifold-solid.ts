import type { Manifold } from "manifold-3d";
import { getManifold } from "../validate/shape-cleaner";
import type { Mesh } from "./types";

/**
 * Build a manifold-3d solid from our lightweight Mesh. Calls Mesh.merge()
 * first so triangle-soup input (e.g. freshly imported from an STL file,
 * where triangles don't share vertex indices) gets welded into a proper
 * manifold topology. This is a no-op for meshes that are already welded
 * (e.g. anything produced by manifold-3d itself, such as extrusions).
 */
export function meshToManifoldSolid(mesh: Mesh): Manifold {
  const wasm = getManifold();
  const manifoldMesh = new wasm.Mesh({
    numProp: 3,
    vertProperties: mesh.vertices,
    triVerts: mesh.triangleIndices,
  });
  manifoldMesh.merge();
  return wasm.Manifold.ofMesh(manifoldMesh);
}
