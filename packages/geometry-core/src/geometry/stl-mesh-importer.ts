import type { Mesh } from "./types";

const HEADER_BYTES = 80;
const TRIANGLE_COUNT_BYTES = 4;
const BYTES_PER_TRIANGLE = 50;
const BYTES_PER_VERTEX = 12;
const NORMAL_BYTES = 12;

/**
 * Parse a binary STL file into our lightweight Mesh (triangle soup - no
 * shared vertex indices). Callers that feed the result into manifold-3d
 * must weld it first (see meshToManifoldSolid, which calls Mesh.merge()).
 */
export function parseBinaryStl(bytes: ArrayBuffer | Uint8Array): Mesh {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  const signature = String.fromCharCode(
    ...buffer.subarray(0, Math.min(5, buffer.byteLength)),
  );
  if (signature === "solid") {
    throw new Error("ASCII STL files are not supported; expected binary STL");
  }

  if (buffer.byteLength < HEADER_BYTES + TRIANGLE_COUNT_BYTES) {
    throw new Error(`STL too short for header: ${buffer.byteLength} bytes`);
  }

  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const triangleCount = view.getUint32(HEADER_BYTES, true);
  const expectedLength =
    HEADER_BYTES + TRIANGLE_COUNT_BYTES + BYTES_PER_TRIANGLE * triangleCount;
  if (buffer.byteLength !== expectedLength) {
    throw new Error(
      `STL length ${buffer.byteLength} does not match triangle count ${triangleCount} (expected ${expectedLength})`,
    );
  }

  const vertexCount = triangleCount * 3;
  const vertices = new Float32Array(vertexCount * 3);
  const triangleIndices = new Uint32Array(vertexCount);

  for (let tri = 0; tri < triangleCount; tri++) {
    const triOffset =
      HEADER_BYTES + TRIANGLE_COUNT_BYTES + tri * BYTES_PER_TRIANGLE;
    for (let corner = 0; corner < 3; corner++) {
      const vertexOffset =
        triOffset + NORMAL_BYTES + corner * BYTES_PER_VERTEX;
      const vertexIndex = tri * 3 + corner;
      vertices[vertexIndex * 3] = view.getFloat32(vertexOffset, true);
      vertices[vertexIndex * 3 + 1] = view.getFloat32(vertexOffset + 4, true);
      vertices[vertexIndex * 3 + 2] = view.getFloat32(vertexOffset + 8, true);
      triangleIndices[vertexIndex] = vertexIndex;
    }
  }

  return { vertices, triangleIndices };
}
