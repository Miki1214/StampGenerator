import { describe, expect, it } from "vitest";
import type { Mesh } from "../../src/geometry/types";
import { BinaryStlExporter } from "../../src/export/binary-stl-exporter";

describe("BinaryStlExporter", () => {
  it("exports a single-triangle mesh as an 80-byte header, little-endian count of 1, and one 50-byte triangle record", () => {
    const mesh: Mesh = {
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      triangleIndices: new Uint32Array([0, 1, 2]),
    };

    const bytes = new BinaryStlExporter().export(mesh);

    expect(bytes.byteLength).toBe(84 + 50);
    expect(bytes.subarray(0, 80).byteLength).toBe(80);

    const triangleCount = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
      80,
      true,
    );
    expect(triangleCount).toBe(1);
    expect(bytes.subarray(84).byteLength).toBe(50);
  });

  it("exports a multi-triangle mesh with byte length exactly 84 plus 50 times the triangle count", () => {
    const mesh: Mesh = {
      vertices: new Float32Array([
        0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0,
      ]),
      triangleIndices: new Uint32Array([0, 1, 2, 1, 3, 2]),
    };

    const bytes = new BinaryStlExporter().export(mesh);

    const triangleCount = mesh.triangleIndices.length / 3;
    expect(bytes.byteLength).toBe(84 + 50 * triangleCount);
  });
});
