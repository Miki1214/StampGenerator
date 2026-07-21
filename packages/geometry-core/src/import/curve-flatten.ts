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
  tolerance: number,
): Point2D[] {
  if (controlsLieOnChord(p0, p1, p2, p3)) {
    return [copyPoint(p0), copyPoint(p3)];
  }

  const points: Point2D[] = [copyPoint(p0)];
  subdivide(p0, p1, p2, p3, tolerance, points);
  return points;
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

/**
 * Recursive de Casteljau subdivision. Appends the end point of each accepted
 * flat segment (start is already in `out`).
 */
function subdivide(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  tolerance: number,
  out: Point2D[],
): void {
  const maxDeviation = Math.sqrt(
    Math.max(
      pointToSegmentDistanceSq(p1, p0, p3),
      pointToSegmentDistanceSq(p2, p0, p3),
    ),
  );

  if (maxDeviation <= tolerance) {
    out.push(copyPoint(p3));
    return;
  }

  const p01 = midpoint(p0, p1);
  const p12 = midpoint(p1, p2);
  const p23 = midpoint(p2, p3);
  const p012 = midpoint(p01, p12);
  const p123 = midpoint(p12, p23);
  const p0123 = midpoint(p012, p123);

  subdivide(p0, p01, p012, p0123, tolerance, out);
  subdivide(p0123, p123, p23, p3, tolerance, out);
}

function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
