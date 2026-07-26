import { describe, expect, it } from "vitest";
import {
  getMeshBoundingBox,
  scaleMeshXY,
  translateMesh,
  translateMeshZ,
} from "../../src/geometry/mesh-bounds";
import type { Mesh } from "../../src/geometry/types";

function boxMesh(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
): Mesh {
  const corners = [
    [minX, minY, minZ],
    [maxX, minY, minZ],
    [maxX, maxY, minZ],
    [minX, maxY, minZ],
    [minX, minY, maxZ],
    [maxX, minY, maxZ],
    [maxX, maxY, maxZ],
    [minX, maxY, maxZ],
  ];
  const vertices = new Float32Array(corners.flat());
  const triangleIndices = new Uint32Array([0, 1, 2]);
  return { vertices, triangleIndices };
}

describe("getMeshBoundingBox", () => {
  it("returns the min/max per axis across all vertices", () => {
    const mesh = boxMesh(-10, 15, -12.5, 12.5, 0, 5);
    expect(getMeshBoundingBox(mesh)).toEqual({
      minX: -10,
      maxX: 15,
      minY: -12.5,
      maxY: 12.5,
      minZ: 0,
      maxZ: 5,
    });
  });
});

describe("translateMeshZ", () => {
  it("shifts only the Z coordinate of every vertex", () => {
    const mesh = boxMesh(0, 10, 0, 10, 0, 5);
    const translated = translateMeshZ(mesh, 3);
    const box = getMeshBoundingBox(translated);
    expect(box.minZ).toBeCloseTo(3);
    expect(box.maxZ).toBeCloseTo(8);
    expect(box.minX).toBeCloseTo(0);
    expect(box.maxX).toBeCloseTo(10);
  });
});

describe("translateMesh", () => {
  it("shifts all three axes independently", () => {
    const mesh = boxMesh(0, 10, 0, 10, 0, 5);
    const translated = translateMesh(mesh, 2, -3, 1);
    const box = getMeshBoundingBox(translated);
    expect(box.minX).toBeCloseTo(2);
    expect(box.maxX).toBeCloseTo(12);
    expect(box.minY).toBeCloseTo(-3);
    expect(box.maxY).toBeCloseTo(7);
    expect(box.minZ).toBeCloseTo(1);
    expect(box.maxZ).toBeCloseTo(6);
  });
});

describe("scaleMeshXY", () => {
  it("scales X and Y independently about the given pivot, leaving Z untouched", () => {
    const mesh = boxMesh(-10, 15, -12.5, 12.5, 0, 5);
    const pivotX = 2.5; // (minX+maxX)/2
    const pivotY = 0; // (minY+maxY)/2
    const scaled = scaleMeshXY(mesh, 2, 3, pivotX, pivotY);

    const box = getMeshBoundingBox(scaled);
    // Native width 25 -> scaled 50, centered on the same pivot.
    expect(box.minX).toBeCloseTo(-22.5);
    expect(box.maxX).toBeCloseTo(27.5);
    // Native depth 25 -> scaled 75, centered on the same pivot.
    expect(box.minY).toBeCloseTo(-37.5);
    expect(box.maxY).toBeCloseTo(37.5);
    expect(box.minZ).toBeCloseTo(0);
    expect(box.maxZ).toBeCloseTo(5);
  });
});
