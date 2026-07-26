import type { PathShapeSet, PolygonWithHoles, Ring } from "../validate/types";

/**
 * Mirror shapes in X for stamp imprint (reads correctly when pressed).
 * When `centerX` is omitted, uses the shape-set tight bbox center (Draw/SVG
 * without a frame). When a design frame is in play, pass the frame's center
 * X so circular / off-center layouts stay concentric with the stamp.
 */
export function mirrorShapes(
  shapes: PathShapeSet,
  centerX?: number,
): PathShapeSet {
  if (shapes.length === 0) {
    return [];
  }

  const axisX =
    centerX !== undefined ? centerX : boundingBoxCenterX(shapes);

  return shapes.map(
    (shape): PolygonWithHoles => ({
      outer: mirrorRing(shape.outer, axisX),
      holes: shape.holes.map((hole) => mirrorRing(hole, axisX)),
    }),
  );
}

function boundingBoxCenterX(shapes: PathShapeSet): number {
  let minX = Infinity;
  let maxX = -Infinity;

  for (const shape of shapes) {
    for (const point of allPoints(shape)) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
    }
  }

  return (minX + maxX) / 2;
}

function allPoints(shape: PolygonWithHoles): { x: number; y: number }[] {
  return [
    ...shape.outer.points,
    ...shape.holes.flatMap((hole) => hole.points),
  ];
}

function mirrorRing(ring: Ring, centerX: number): Ring {
  return {
    points: ring.points.map((p) => ({
      x: 2 * centerX - p.x,
      y: p.y,
    })),
  };
}
