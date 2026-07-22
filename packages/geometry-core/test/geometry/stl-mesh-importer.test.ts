import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getMeshBoundingBox } from "../../src/geometry/mesh-bounds";
import { parseBinaryStl } from "../../src/geometry/stl-mesh-importer";

const stlsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../stls",
);

function buildSingleTriangleStl(): Uint8Array {
  const triangleCount = 1;
  const buffer = new ArrayBuffer(84 + 50 * triangleCount);
  const view = new DataView(buffer);
  view.setUint32(80, triangleCount, true);

  const offset = 84;
  // normal (ignored by the importer)
  view.setFloat32(offset, 0, true);
  view.setFloat32(offset + 4, 0, true);
  view.setFloat32(offset + 8, 1, true);
  // three vertices of a right triangle
  const verts: [number, number, number][] = [
    [0, 0, 0],
    [10, 0, 0],
    [0, 10, 0],
  ];
  verts.forEach(([x, y, z], i) => {
    const vOffset = offset + 12 + i * 12;
    view.setFloat32(vOffset, x, true);
    view.setFloat32(vOffset + 4, y, true);
    view.setFloat32(vOffset + 8, z, true);
  });

  return new Uint8Array(buffer);
}

describe("parseBinaryStl", () => {
  it("parses a single-triangle binary STL into a triangle-soup Mesh", () => {
    const mesh = parseBinaryStl(buildSingleTriangleStl());

    expect(mesh.vertices.length / 3).toBe(3);
    expect(Array.from(mesh.triangleIndices)).toEqual([0, 1, 2]);
    expect(getMeshBoundingBox(mesh)).toEqual({
      minX: 0,
      maxX: 10,
      minY: 0,
      maxY: 10,
      minZ: 0,
      maxZ: 0,
    });
  });

  it("rejects ASCII STL input with a clear error", () => {
    const ascii = new TextEncoder().encode("solid test\nendsolid test\n");
    expect(() => parseBinaryStl(ascii)).toThrow(/ASCII/i);
  });

  it("rejects a truncated/corrupt binary STL with a clear error", () => {
    const truncated = buildSingleTriangleStl().slice(0, 90);
    expect(() => parseBinaryStl(truncated)).toThrow(/does not match/i);
  });

  it("parses the bundled MinimalBase.stl into the expected 25x25x5 footprint", () => {
    const bytes = readFileSync(join(stlsDir, "MinimalBase.stl"));
    const mesh = parseBinaryStl(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );

    const box = getMeshBoundingBox(mesh);
    expect(box.maxX - box.minX).toBeCloseTo(25);
    expect(box.maxY - box.minY).toBeCloseTo(25);
    expect(box.maxZ - box.minZ).toBeCloseTo(5);
  });
});
