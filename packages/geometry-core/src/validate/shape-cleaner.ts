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

export async function initManifold(): Promise<void> {
  if (wasm) {
    return;
  }
  const manifold = await Module();
  manifold.setup();
  wasm = manifold;
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

/** Even nesting depth → CCW outer; odd depth → CW hole (NonZero fill). */
function orientRingsForFill(rings: Point2D[][]): Point2D[][] {
  return rings.map((points, index) => {
    const depth = rings.reduce((count, other, otherIndex) => {
      if (otherIndex === index) {
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

  return outers.map(
    (outer): PolygonWithHoles => ({
      outer,
      holes: holes.filter((hole) => ringFullyInside(hole.points, outer.points)),
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
