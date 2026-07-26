export interface Point2DLike {
  x: number;
  y: number;
}

/**
 * Laplacian smoothing for an open polyline: repeatedly nudges each interior
 * point toward the midpoint of its two neighbors, leaving the first and last
 * points fixed. This removes high-frequency jitter (hand tremor, noisy
 * pointer sampling) from a freehand stroke while preserving its overall
 * shape and endpoints.
 *
 * @param points centerline points, in drawing order
 * @param iterations number of smoothing passes (more = smoother, but softer corners)
 * @param factor blend strength per pass, in (0, 1]; 0 = no change, 1 = full
 *   snap to the neighbor midpoint
 */
export function smoothPolyline<T extends Point2DLike>(
  points: readonly T[],
  iterations: number,
  factor: number,
): Point2DLike[] {
  let current: Point2DLike[] = points.map((p) => ({ x: p.x, y: p.y }));
  if (current.length < 3 || iterations <= 0 || factor <= 0) {
    return current;
  }

  for (let pass = 0; pass < iterations; pass++) {
    const next: Point2DLike[] = [current[0]];
    for (let i = 1; i < current.length - 1; i++) {
      const prev = current[i - 1];
      const cur = current[i];
      const nxt = current[i + 1];
      next.push({
        x: cur.x + factor * ((prev.x + nxt.x) / 2 - cur.x),
        y: cur.y + factor * ((prev.y + nxt.y) / 2 - cur.y),
      });
    }
    next.push(current[current.length - 1]);
    current = next;
  }

  return current;
}
