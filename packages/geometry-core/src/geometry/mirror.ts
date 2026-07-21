import type { PathShapeSet, PolygonWithHoles, Ring } from "../validate/types";

export function mirrorShapes(shapes: PathShapeSet): PathShapeSet {
  if (shapes.length === 0) {
    return [];
  }

  const centerX = boundingBoxCenterX(shapes);

  return shapes.map(
    (shape): PolygonWithHoles => ({
      outer: mirrorRing(shape.outer, centerX),
      holes: shape.holes.map((hole) => mirrorRing(hole, centerX)),
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
