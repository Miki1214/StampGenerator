import Module from "manifold-3d";
import type { ManifoldToplevel, Vec2 } from "manifold-3d";
import type { RawPathSet } from "../import/types";
import type { PathShapeSet, ShapeCleaner as ShapeCleanerContract } from "./types";

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

    const contours: Vec2[][] = raw.rings.map((ring) =>
      ring.points.map((p): Vec2 => [p.x, p.y]),
    );

    const crossSection = wasm.CrossSection.ofPolygons(contours, "NonZero");
    try {
      const polygons = crossSection.toPolygons();
      return polygons.map((poly) => ({
        outer: {
          points: poly.map(([x, y]) => ({ x, y })),
        },
        holes: [],
      }));
    } finally {
      crossSection.delete();
    }
  }
}
