import { beforeEach, describe, expect, it } from "vitest";
import {
  getStampHardwareMesh,
  setStampHardwareDataProvider,
  STAMP_HARDWARE_FILES,
  type StampHardwarePart,
} from "../../src/geometry/stamp-hardware";

function buildSingleTriangleStlBytes(): ArrayBuffer {
  const buffer = new ArrayBuffer(84 + 50);
  const view = new DataView(buffer);
  view.setUint32(80, 1, true);
  const offset = 84 + 12;
  const verts: [number, number, number][] = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
  ];
  verts.forEach(([x, y, z], i) => {
    view.setFloat32(offset + i * 12, x, true);
    view.setFloat32(offset + i * 12 + 4, y, true);
    view.setFloat32(offset + i * 12 + 8, z, true);
  });
  return buffer;
}

describe("stamp-hardware", () => {
  beforeEach(() => {
    setStampHardwareDataProvider(() => buildSingleTriangleStlBytes());
  });

  it("exposes the expected static asset filenames", () => {
    expect(STAMP_HARDWARE_FILES.handle).toBe("Handle.stl");
    expect(STAMP_HARDWARE_FILES.base).toBe("MinimalBase.stl");
  });

  it("loads and caches a mesh per hardware part via the injected provider", () => {
    let callCount = 0;
    setStampHardwareDataProvider(() => {
      callCount++;
      return buildSingleTriangleStlBytes();
    });

    const first = getStampHardwareMesh("handle");
    const second = getStampHardwareMesh("handle");

    expect(first).toBe(second);
    expect(callCount).toBe(1);
  });

  it("loads independent meshes per part", () => {
    const parts: StampHardwarePart[] = ["handle", "base"];
    for (const part of parts) {
      expect(() => getStampHardwareMesh(part)).not.toThrow();
    }
  });

  it("throws a clear error when no provider has been set", () => {
    setStampHardwareDataProvider(undefined as never);

    expect(() => getStampHardwareMesh("handle")).toThrow(
      /data provider is not set/i,
    );
  });
});
