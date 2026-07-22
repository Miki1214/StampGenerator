import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { getMeshBoundingBox } from "../../src/geometry/mesh-bounds";
import { meshToManifoldSolid } from "../../src/geometry/mesh-to-manifold-solid";
import {
  setStampHardwareDataProvider,
  STAMP_HARDWARE_FILES,
  type StampHardwarePart,
} from "../../src/geometry/stamp-hardware";
import { StampGeometryBuilder } from "../../src/geometry/stamp-geometry-builder";
import type { StampOptions } from "../../src/geometry/types";
import { initManifold } from "../../src/validate/shape-cleaner";
import type { PathShapeSet } from "../../src/validate/types";

const stlsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../stls",
);

describe("StampGeometryBuilder", () => {
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

  it("builds a manifold mesh from a simple asymmetric shape", () => {
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 10, y: 10 },
            { x: 40, y: 10 },
            { x: 40, y: 20 },
            { x: 20, y: 20 },
            { x: 20, y: 40 },
            { x: 10, y: 40 },
          ],
        },
        holes: [],
      },
    ];
    const opts: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 50,
      canvasSizeMm: 50,
      baseShape: "square",
    };

    const builder = new StampGeometryBuilder();
    const mesh = builder.build(shapes, opts);

    const solid = meshToManifoldSolid(mesh);
    try {
      expect(solid.status()).toBe("NoError");
      expect(solid.volume()).toBeGreaterThan(0);
    } finally {
      solid.delete();
    }
  });

  it("includes the static handle geometry, unscaled, above the base", () => {
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
            { x: 50, y: 50 },
            { x: 0, y: 50 },
          ],
        },
        holes: [],
      },
    ];
    const opts: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 50,
      canvasSizeMm: 50,
      baseShape: "square",
    };

    const mesh = new StampGeometryBuilder().build(shapes, opts);
    const box = getMeshBoundingBox(mesh);

    // Handle alone is ~100mm tall; the whole assembly (design + base +
    // handle) must be at least that tall, and normalized to start at Z=0.
    expect(box.minZ).toBeCloseTo(0);
    expect(box.maxZ).toBeGreaterThan(100);
  });

  it("centers the design over the base footprint regardless of the drawing's canvas position", () => {
    // A shape drawn far from the canvas origin - once mapped to mm this
    // would sit at X/Y ≈ [40,52], way outside the static base/handle model's
    // own footprint (authored near X=2.5, Y=0) unless the builder recenters
    // it. Without recentering the design and base wouldn't overlap at all.
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 200, y: 200 },
            { x: 260, y: 200 },
            { x: 260, y: 260 },
            { x: 200, y: 260 },
          ],
        },
        holes: [],
      },
    ];
    const opts: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 300,
      canvasSizeMm: 60,
      baseShape: "square",
    };

    const mesh = new StampGeometryBuilder().build(shapes, opts);

    // If un-recentered, the design's mm-space X/Y would be ~[40,52], well
    // beyond the base/handle's own native footprint - so keeping the whole
    // assembly's bounding box within that footprint's range proves the
    // design was pulled back onto the base rather than left floating.
    const box = getMeshBoundingBox(mesh);
    expect(box.maxX).toBeLessThan(35);
    expect(box.maxY).toBeLessThan(35);
  });

  it("scales the base footprint to match a larger canvas size while keeping the handle static", () => {
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 0, y: 100 },
          ],
        },
        holes: [],
      },
    ];
    const smallOpts: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 100,
      canvasSizeMm: 25,
      baseShape: "square",
    };
    const largeOpts: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 100,
      canvasSizeMm: 50,
      baseShape: "square",
    };

    const smallMesh = new StampGeometryBuilder().build(shapes, smallOpts);
    const largeMesh = new StampGeometryBuilder().build(shapes, largeOpts);

    const smallBox = getMeshBoundingBox(smallMesh);
    const largeBox = getMeshBoundingBox(largeMesh);

    expect(largeBox.maxX - largeBox.minX).toBeGreaterThan(
      smallBox.maxX - smallBox.minX,
    );
    expect(largeBox.maxY - largeBox.minY).toBeGreaterThan(
      smallBox.maxY - smallBox.minY,
    );
  });

  it("sizes the base to the configured canvas size", () => {
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 0, y: 0 },
            { x: 40, y: 0 },
            { x: 40, y: 40 },
            { x: 0, y: 40 },
          ],
        },
        holes: [],
      },
    ];
    const opts: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 100,
      canvasSizeMm: 100,
      baseShape: "square",
    };

    const mesh = new StampGeometryBuilder().build(shapes, opts);
    const box = getMeshBoundingBox(mesh);

    // Base follows the 100 mm canvas, not the smaller 40 mm design footprint.
    expect(box.maxX - box.minX).toBeGreaterThanOrEqual(95);
    expect(box.maxY - box.minY).toBeGreaterThanOrEqual(95);
  });

  it("sizes the base to the configured canvas size even when the design is smaller", () => {
    // The design only fills a 40x40mm corner of a much larger 100x100mm
    // canvas - the base must follow the design's real 40x40 footprint, not
    // canvasSizeMm=100.
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 0, y: 0 },
            { x: 40, y: 0 },
            { x: 40, y: 40 },
            { x: 0, y: 40 },
          ],
        },
        holes: [],
      },
    ];
    const opts: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 100,
      canvasSizeMm: 100,
      baseShape: "square",
    };

    const mesh = new StampGeometryBuilder().build(shapes, opts);
    const box = getMeshBoundingBox(mesh);

    // The base should match the full 100 mm canvas, not the 40 mm design.
    expect(box.maxX - box.minX).toBeGreaterThanOrEqual(95);
    expect(box.maxY - box.minY).toBeGreaterThanOrEqual(95);
  });

  it("builds a round base matching the configured stamp diameter", () => {
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
            { x: 50, y: 50 },
            { x: 0, y: 50 },
          ],
        },
        holes: [],
      },
    ];
    const opts: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 50,
      canvasSizeMm: 50,
      baseShape: "round",
    };

    const mesh = new StampGeometryBuilder().build(shapes, opts);
    const box = getMeshBoundingBox(mesh);

    expect(box.maxX - box.minX).toBeGreaterThanOrEqual(45);
    expect(box.maxY - box.minY).toBeGreaterThanOrEqual(45);
    expect(box.maxX - box.minX).toBeLessThanOrEqual(55);
    expect(box.maxY - box.minY).toBeLessThanOrEqual(55);
  });

  it("mirrors an asymmetric L-shape so the tall stem ends up on the opposite side of the plate", () => {
    // Stem on the LEFT before mirror (x=10-20, y up to 40).
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 10, y: 10 },
            { x: 40, y: 10 },
            { x: 40, y: 20 },
            { x: 20, y: 20 },
            { x: 20, y: 40 },
            { x: 10, y: 40 },
          ],
        },
        holes: [],
      },
    ];
    const opts: StampOptions = {
      designHeightMm: 2,
      canvasSizeUnits: 50,
      canvasSizeMm: 50,
      baseShape: "square",
    };

    const mesh = new StampGeometryBuilder().build(shapes, opts);

    // After normalization the design's bottom face sits exactly at Z=0 -
    // unique to the design (the base's bottom face is flush with the
    // design's *top* face at Z=designHeightMm, so using that boundary would
    // also pick up the base's much larger, differently-shaped footprint).
    const designXy: { x: number; y: number }[] = [];
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const z = mesh.vertices[i + 2];
      const x = mesh.vertices[i];
      const y = mesh.vertices[i + 1];
      if (z <= 1e-3) {
        designXy.push({ x, y });
      }
    }

    // The design is recentered onto the base, so check the mirror relative
    // to the design's own (recentered) bbox center rather than a fixed
    // absolute coordinate.
    const centerX =
      (Math.min(...designXy.map((p) => p.x)) +
        Math.max(...designXy.map((p) => p.x))) /
      2;
    const centerY =
      (Math.min(...designXy.map((p) => p.y)) +
        Math.max(...designXy.map((p) => p.y))) /
      2;
    const tallStemYs = designXy.filter((p) => p.y > centerY + 5);
    expect(tallStemYs.length).toBeGreaterThan(0);
    // Original stem was on the left (low X); after mirroring it must now be
    // on the right (high X) half of the design.
    expect(Math.min(...tallStemYs.map((p) => p.x))).toBeGreaterThan(centerX);
  });
});
