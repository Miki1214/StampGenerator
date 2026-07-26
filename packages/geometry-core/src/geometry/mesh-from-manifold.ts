import type { Mesh } from "./types";

/** Convert a manifold-3d MeshGL into our lightweight Mesh (xyz only). */
export function meshFromManifold(manifoldMesh: {
  numProp: number;
  vertProperties: Float32Array;
  triVerts: Uint32Array;
}): Mesh {
  const { numProp, vertProperties, triVerts } = manifoldMesh;
  const vertexCount = vertProperties.length / numProp;
  const vertices = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    const src = i * numProp;
    const dst = i * 3;
    vertices[dst] = vertProperties[src];
    vertices[dst + 1] = vertProperties[src + 1];
    vertices[dst + 2] = vertProperties[src + 2];
  }

  return {
    vertices,
    triangleIndices: new Uint32Array(triVerts),
  };
}
