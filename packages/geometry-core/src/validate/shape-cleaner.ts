import Module from "manifold-3d";
import type { ManifoldToplevel, Vec2 } from "manifold-3d";
import type { Point2D, RawPathSet } from "../import/types";
import type {
  PathShapeSet,
  PolygonWithHoles,
  Ring,
  ShapeCleaner as ShapeCleanerContract,
} from "./types";

let wasm: ManifoldToplevel | null = null;

export type InitManifoldOptions = {
  /** Browser bundlers must pass the resolved URL of manifold.wasm. */
  locateFile?: () => string;
};

export async function initManifold(
  options: InitManifoldOptions = {},
): Promise<void> {
  if (wasm) {
    return;
  }
  const manifold = await Module(
    options.locateFile ? { locateFile: options.locateFile } : undefined,
  );
  manifold.setup();
  wasm = manifold;
}

export function getManifold(): ManifoldToplevel {
  if (!wasm) {
    throw new Error("Manifold not initialized; call initManifold() first");
  }
  return wasm;
}

export class ShapeCleaner implements ShapeCleanerContract {
  clean(raw: RawPathSet): PathShapeSet {
    if (!wasm) {
      throw new Error("Manifold not initialized; call initManifold() first");
    }

    const oriented = orientRingsForFill(raw.rings.map((r) => r.points));
    const contours: Vec2[][] = oriented.map((points) =>
      points.map((p): Vec2 => [p.x, p.y]),
    );

    const crossSection = wasm.CrossSection.ofPolygons(contours, "NonZero");
    try {
      return nestPolygons(
        crossSection.toPolygons().map((poly) => ({
          points: poly.map(([x, y]) => ({ x, y })),
        })),
      );
    } finally {
      crossSection.delete();
    }
  }
}

type RingBBox = { minX: number; maxX: number; minY: number; maxY: number };

function ringBoundingBox(points: Point2D[]): RingBBox {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) {
      minX = p.x;
    }
    if (p.x > maxX) {
      maxX = p.x;
    }
    if (p.y < minY) {
      minY = p.y;
    }
    if (p.y > maxY) {
      maxY = p.y;
    }
  }
  return { minX, maxX, minY, maxY };
}

function bboxesOverlap(a: RingBBox, b: RingBBox): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

/** Even nesting depth → CCW outer; odd depth → CW hole (NonZero fill). */
function orientRingsForFill(rings: Point2D[][]): Point2D[][] {
  const boxes = rings.map(ringBoundingBox);
  return rings.map((points, index) => {
    const depth = rings.reduce((count, other, otherIndex) => {
      if (otherIndex === index) {
        return count;
      }
      if (!bboxesOverlap(boxes[index], boxes[otherIndex])) {
        return count;
      }
      return ringFullyInside(points, other) ? count + 1 : count;
    }, 0);

    const area = signedArea(points);
    const shouldBePositive = depth % 2 === 0;
    if ((area > 0) === shouldBePositive) {
      return points;
    }
    return [...points].reverse();
  });
}

function nestPolygons(rings: Ring[]): PathShapeSet {
  const outers = rings.filter((r) => signedArea(r.points) > 0);
  const holes = rings.filter((r) => signedArea(r.points) < 0);
  const outerBoxes = outers.map((o) => ringBoundingBox(o.points));

  return outers.map(
    (outer, outerIndex): PolygonWithHoles => ({
      outer,
      holes: holes.filter((hole) => {
        const holeBox = ringBoundingBox(hole.points);
        if (!bboxesOverlap(holeBox, outerBoxes[outerIndex])) {
          return false;
        }
        return ringFullyInside(hole.points, outer.points);
      }),
    }),
  );
}

function ringFullyInside(inner: Point2D[], outer: Point2D[]): boolean {
  return inner.every((point) => pointInRing(point, outer));
}

function signedArea(points: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function pointInRing(point: Point2D, ring: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}
