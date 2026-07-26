import type { Mesh } from "@stamp-generator/geometry-core";
import { BufferAttribute, BufferGeometry } from "three";

/** Convert geometry-core Mesh buffers into a Three.js BufferGeometry. */
export function meshToThreeGeometry(mesh: Mesh): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(mesh.vertices, 3),
  );
  geometry.setIndex(new BufferAttribute(mesh.triangleIndices, 1));
  geometry.computeVertexNormals();
  return geometry;
}
