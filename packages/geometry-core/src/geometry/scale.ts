import type { PathShapeSet, PolygonWithHoles, Ring } from "../validate/types";
import type { StampOptions } from "./types";

export function scaleToMm(
  shapes: PathShapeSet,
  opts: StampOptions,
): PathShapeSet {
  const factor = opts.canvasSizeMm / opts.canvasSizeUnits;

  return shapes.map(
    (shape): PolygonWithHoles => ({
      outer: scaleRing(shape.outer, factor),
      holes: shape.holes.map((hole) => scaleRing(hole, factor)),
    }),
  );
}

function scaleRing(ring: Ring, factor: number): Ring {
  return {
    points: ring.points.map((p) => ({
      x: p.x * factor,
      y: p.y * factor,
    })),
  };
}
