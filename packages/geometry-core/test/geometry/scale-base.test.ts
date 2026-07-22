import { describe, expect, it } from "vitest";
import { getMeshBoundingBox } from "../../src/geometry/mesh-bounds";
import { scaleBaseMeshToFootprint } from "../../src/geometry/scale-base";
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

describe("scaleBaseMeshToFootprint", () => {
  it("grows a native 25x25 base to match a larger target footprint, keeping Z fixed", () => {
    const base = boxMesh(-10, 15, -12.5, 12.5, 0, 5);

    const scaled = scaleBaseMeshToFootprint(base, 50, 50);

    const box = getMeshBoundingBox(scaled);
    expect(box.maxX - box.minX).toBeCloseTo(50);
    expect(box.maxY - box.minY).toBeCloseTo(50);
    expect(box.minZ).toBeCloseTo(0);
    expect(box.maxZ).toBeCloseTo(5);
  });

  it("scales width and depth independently for a non-square design", () => {
    const base = boxMesh(-10, 15, -12.5, 12.5, 0, 5);

    const scaled = scaleBaseMeshToFootprint(base, 80, 40);

    const box = getMeshBoundingBox(scaled);
    expect(box.maxX - box.minX).toBeCloseTo(80);
    expect(box.maxY - box.minY).toBeCloseTo(40);
  });

  it("keeps the scaled footprint centered on the base's own bounding-box center", () => {
    const base = boxMesh(-10, 15, -12.5, 12.5, 0, 5);

    const scaled = scaleBaseMeshToFootprint(base, 50, 50);

    const box = getMeshBoundingBox(scaled);
    expect((box.minX + box.maxX) / 2).toBeCloseTo(2.5);
    expect((box.minY + box.maxY) / 2).toBeCloseTo(0);
  });

  it("clamps each axis's scale to a minimum of 1x so the base is never shrunk below its native size", () => {
    const base = boxMesh(-10, 15, -12.5, 12.5, 0, 5);

    // A target smaller than the native 25x25 footprint must not shrink it.
    const scaled = scaleBaseMeshToFootprint(base, 10, 10);

    const box = getMeshBoundingBox(scaled);
    expect(box.maxX - box.minX).toBeCloseTo(25);
    expect(box.maxY - box.minY).toBeCloseTo(25);
  });
});
