import type { Point2D } from "@stamp-generator/geometry-core";

/**
 * Expand an open polyline stroke into a closed ribbon polygon suitable for
 * filled stamp geometry (manifold CrossSection), instead of closing the
 * centerline into a filled chord/blob.
 */
export function strokeToOutline(
  centerline: Point2D[],
  width: number,
): Point2D[] {
  const points = dedupeNear(centerline, 0.01);
  if (points.length < 2 || !(width > 0)) {
    return [];
  }

  const half = width / 2;
  const left: Point2D[] = [];
  const right: Point2D[] = [];

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    let len = Math.hypot(dx, dy);
    if (len < 1e-9) {
      // Degenerate: fall back to neighboring segment.
      if (i + 1 < points.length) {
        dx = points[i + 1].x - points[i].x;
        dy = points[i + 1].y - points[i].y;
      } else if (i > 0) {
        dx = points[i].x - points[i - 1].x;
        dy = points[i].y - points[i - 1].y;
      } else {
        dx = 1;
        dy = 0;
      }
      len = Math.hypot(dx, dy) || 1;
    }
    const nx = -dy / len;
    const ny = dx / len;
    left.push({
      x: points[i].x + nx * half,
      y: points[i].y + ny * half,
    });
    right.push({
      x: points[i].x - nx * half,
      y: points[i].y - ny * half,
    });
  }

  const outline = [...left, ...right.reverse()];
  const first = outline[0];
  outline.push({ x: first.x, y: first.y });
  return outline;
}

function dedupeNear(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length === 0) {
    return [];
  }
  const out: Point2D[] = [{ ...points[0] }];
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1];
    const p = points[i];
    if (Math.hypot(p.x - prev.x, p.y - prev.y) > epsilon) {
      out.push({ ...p });
    }
  }
  return out;
}
