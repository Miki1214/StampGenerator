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
    return bytes;
  }
}
