import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  setStampHardwareDataProvider,
  STAMP_HARDWARE_FILES,
  type StampHardwarePart,
} from "../../src/geometry/stamp-hardware";
import type { StampOptions } from "../../src/geometry/types";
import { initManifold } from "../../src/validate/shape-cleaner";
import type { PathShapeSet } from "../../src/validate/types";
import { unionMeshes } from "../../src/geometry/union";

vi.mock("../../src/geometry/union", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/geometry/union")>();
  return {
    ...actual,
    unionMeshes: vi.fn(actual.unionMeshes),
  };
});

const { StampGeometryBuilder } = await import(
  "../../src/geometry/stamp-geometry-builder"
);

const stlsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../stls",
);

const square = (x: number, y: number, size: number): PathShapeSet => [
  {
    outer: {
      points: [
        { x, y },
        { x: x + size, y },
        { x: x + size, y: y + size },
        { x, y: y + size },
      ],
    },
    holes: [],
  },
];

describe("StampGeometryBuilder base+handle cache", () => {
  beforeAll(async () => {
    await initManifold();
    setStampHardwareDataProvider((part: StampHardwarePart) => {
      const bytes = readFileSync(join(stlsDir, STAMP_HARDWARE_FILES[part]));
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
    });
  });

  beforeEach(() => {
    vi.mocked(unionMeshes).mockClear();
  });

  it("reuses the base+handle union across builds with the same baseShape and canvasSizeMm", () => {
    const opts: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 50,
      canvasSizeMm: 50,
      baseShape: "square",
    };
    const builder = new StampGeometryBuilder();

    builder.build(square(10, 10, 20), opts);
    const unionsAfterFirst = vi.mocked(unionMeshes).mock.calls.length;
    expect(unionsAfterFirst).toBe(2);

    builder.build(square(5, 5, 15), opts);
    const unionsAfterSecond = vi.mocked(unionMeshes).mock.calls.length;

    // Second build should only union design with the cached base+handle.
    expect(unionsAfterSecond).toBe(3);
  });

  it("recomputes the base+handle union when canvasSizeMm changes", () => {
    const builder = new StampGeometryBuilder();
    const small: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 50,
      canvasSizeMm: 25,
      baseShape: "square",
    };
    const large: StampOptions = {
      ...small,
      canvasSizeMm: 50,
    };

    builder.build(square(10, 10, 20), small);
    expect(vi.mocked(unionMeshes).mock.calls.length).toBe(2);

    builder.build(square(10, 10, 20), large);
    // New base+handle union + design union = 4 total.
    expect(vi.mocked(unionMeshes).mock.calls.length).toBe(4);
  });
});
