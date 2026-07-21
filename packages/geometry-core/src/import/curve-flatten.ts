import type { Point2D } from "./types";

/**
 * Flatten a cubic Bezier into a polyline within `tolerance`.
 * Collinear (degenerate straight) curves collapse to the two endpoints.
 */
export function flattenCubicBezier(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  _tolerance: number,
): Point2D[] {
  if (controlsLieOnChord(p0, p1, p2, p3)) {
    return [copyPoint(p0), copyPoint(p3)];
  }

  return [copyPoint(p0), copyPoint(p3)];
}

function copyPoint(p: Point2D): Point2D {
  return { x: p.x, y: p.y };
}

/** True when both control points lie on the chord from p0 to p3. */
function controlsLieOnChord(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
): boolean {
  const epsilonSq = 1e-12;
  return (
    pointToSegmentDistanceSq(p1, p0, p3) < epsilonSq &&
    pointToSegmentDistanceSq(p2, p0, p3) < epsilonSq
  );
}

function pointToSegmentDistanceSq(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
  }

  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq),
  );
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return (p.x - projX) ** 2 + (p.y - projY) ** 2;
}
