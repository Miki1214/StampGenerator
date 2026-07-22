import type { Mesh } from "./types";

export interface MeshBoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function getMeshBoundingBox(mesh: Mesh): MeshBoundingBox {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  const vertices = mesh.vertices;
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

export function translateMeshZ(mesh: Mesh, dz: number): Mesh {
  return translateMesh(mesh, 0, 0, dz);
}

export function translateMesh(
  mesh: Mesh,
  dx: number,
  dy: number,
  dz: number,
): Mesh {
  const vertices = new Float32Array(mesh.vertices);
  for (let i = 0; i < vertices.length; i += 3) {
    vertices[i] += dx;
    vertices[i + 1] += dy;
    vertices[i + 2] += dz;
  }
  return {
    vertices,
    triangleIndices: mesh.triangleIndices,
  };
}

/**
 * Scale a mesh's X/Y coordinates independently about a pivot point, leaving
 * Z untouched. Used to fit a static base model's footprint to the drawn
 * design without altering its (fixed) thickness.
 */
export function scaleMeshXY(
  mesh: Mesh,
  scaleX: number,
  scaleY: number,
  pivotX: number,
  pivotY: number,
): Mesh {
  const vertices = new Float32Array(mesh.vertices);
  for (let i = 0; i < vertices.length; i += 3) {
    vertices[i] = pivotX + (vertices[i] - pivotX) * scaleX;
    vertices[i + 1] = pivotY + (vertices[i + 1] - pivotY) * scaleY;
  }
  return {
    vertices,
    triangleIndices: mesh.triangleIndices,
  };
}
