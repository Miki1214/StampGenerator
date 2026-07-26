import { describe, expect, it } from "vitest";
import { getMeshBoundingBox } from "../../src/geometry/mesh-bounds";
import {
  buildRoundBase,
  NATIVE_BASE_CENTER,
  NATIVE_BASE_THICKNESS_MM,
} from "../../src/geometry/round-base";
import { initManifold } from "../../src/validate/shape-cleaner";

describe("buildRoundBase", () => {
  it("builds a cylinder with the requested diameter and native base thickness", async () => {
    await initManifold();

    const mesh = buildRoundBase(50);
    const box = getMeshBoundingBox(mesh);

    expect(box.maxX - box.minX).toBeCloseTo(50);
    expect(box.maxY - box.minY).toBeCloseTo(50);
    expect(box.maxZ - box.minZ).toBeCloseTo(NATIVE_BASE_THICKNESS_MM);
    expect((box.minX + box.maxX) / 2).toBeCloseTo(NATIVE_BASE_CENTER.x);
    expect((box.minY + box.maxY) / 2).toBeCloseTo(NATIVE_BASE_CENTER.y);
    expect(box.minZ).toBeCloseTo(0);
  });
});
