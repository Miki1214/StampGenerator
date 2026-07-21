import type { Mesh } from "../geometry/types";

export interface MeshExporter {
  export(mesh: Mesh): Uint8Array;
}

export class BinaryStlExporter implements MeshExporter {
  export(mesh: Mesh): Uint8Array {
    const triangleCount = mesh.triangleIndices.length / 3;
    const bytes = new Uint8Array(84 + 50 * triangleCount);
    const view = new DataView(bytes.buffer);
    view.setUint32(80, triangleCount, true);

    for (let t = 0; t < triangleCount; t++) {
      writeTriangleRecord(view, 84 + t * 50, mesh, t);
    }

    return bytes;
  }
}

function writeTriangleRecord(
  view: DataView,
  offset: number,
  mesh: Mesh,
  triangleIndex: number,
): void {
  const { vertices, triangleIndices } = mesh;
  const i0 = triangleIndices[triangleIndex * 3] * 3;
  const i1 = triangleIndices[triangleIndex * 3 + 1] * 3;
  const i2 = triangleIndices[triangleIndex * 3 + 2] * 3;

  const ax = vertices[i0];
  const ay = vertices[i0 + 1];
  const az = vertices[i0 + 2];
  const bx = vertices[i1];
  const by = vertices[i1 + 1];
  const bz = vertices[i1 + 2];
  const cx = vertices[i2];
  const cy = vertices[i2 + 1];
  const cz = vertices[i2 + 2];

  const [nx, ny, nz] = faceNormal(ax, ay, az, bx, by, bz, cx, cy, cz);

  view.setFloat32(offset, nx, true);
  view.setFloat32(offset + 4, ny, true);
  view.setFloat32(offset + 8, nz, true);
  view.setFloat32(offset + 12, ax, true);
  view.setFloat32(offset + 16, ay, true);
  view.setFloat32(offset + 20, az, true);
  view.setFloat32(offset + 24, bx, true);
  view.setFloat32(offset + 28, by, true);
  view.setFloat32(offset + 32, bz, true);
  view.setFloat32(offset + 36, cx, true);
  view.setFloat32(offset + 40, cy, true);
  view.setFloat32(offset + 44, cz, true);
  // attribute byte count (offset + 48) remains 0
}

function faceNormal(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
): [number, number, number] {
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const acx = cx - ax;
  const acy = cy - ay;
  const acz = cz - az;

  let nx = aby * acz - abz * acy;
  let ny = abz * acx - abx * acz;
  let nz = abx * acy - aby * acx;
  const len = Math.hypot(nx, ny, nz);
  if (len > 0) {
    nx /= len;
    ny /= len;
    nz /= len;
  }
  return [nx, ny, nz];
}
