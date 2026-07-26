import type { Point2D, RawPathSet, RawRing } from "./types";

/**
 * How an imported SVG is fitted into the design frame (canvas units).
 * Size is the max extent as a fraction of `frameUnits`; offsets shift the
 * placed center from the frame center (also as fractions of `frameUnits`).
 */
export interface SvgPlacementOptions {
  frameUnits: number;
  /** Max(width, height) / frameUnits after fit. Clamped to (0, 1]. */
  sizeFraction: number;
  /** Horizontal shift from frame center / frameUnits. 0 = centered. */
  offsetXFraction: number;
  /** Vertical shift from frame center / frameUnits. 0 = centered. */
  offsetYFraction: number;
}

export interface PathBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Tight axis-aligned bounds of all rings; null when there are no points. */
export function rawPathBounds(raw: RawPathSet): PathBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;

  for (const ring of raw.rings) {
    for (const point of ring.points) {
      found = true;
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }
  }

  if (!found) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Uniformly scale + translate raw SVG paths so they fit the design frame:
 * centered by default, with optional size and position fractions.
 */
export function placePathsInFrame(
  raw: RawPathSet,
  options: SvgPlacementOptions,
): RawPathSet {
  const bounds = rawPathBounds(raw);
  if (!bounds) {
    return raw;
  }

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const extent = Math.max(width, height);

  const frameUnits = Math.max(options.frameUnits, Number.EPSILON);
  const sizeFraction = clamp(options.sizeFraction, Number.EPSILON, 1);
  const targetExtent = sizeFraction * frameUnits;

  const scale = extent > 0 ? targetExtent / extent : 1;
  const sourceCenterX = (bounds.minX + bounds.maxX) / 2;
  const sourceCenterY = (bounds.minY + bounds.maxY) / 2;
  const targetCenterX =
    frameUnits / 2 + options.offsetXFraction * frameUnits;
  const targetCenterY =
    frameUnits / 2 + options.offsetYFraction * frameUnits;

  return {
    rings: raw.rings.map((ring) =>
      transformRing(ring, scale, sourceCenterX, sourceCenterY, targetCenterX, targetCenterY),
    ),
  };
}

function transformRing(
  ring: RawRing,
  scale: number,
  sourceCenterX: number,
  sourceCenterY: number,
  targetCenterX: number,
  targetCenterY: number,
): RawRing {
  return {
    points: ring.points.map((point) =>
      transformPoint(
        point,
        scale,
        sourceCenterX,
        sourceCenterY,
        targetCenterX,
        targetCenterY,
      ),
    ),
  };
}

function transformPoint(
  point: Point2D,
  scale: number,
  sourceCenterX: number,
  sourceCenterY: number,
  targetCenterX: number,
  targetCenterY: number,
): Point2D {
  return {
    x: (point.x - sourceCenterX) * scale + targetCenterX,
    y: (point.y - sourceCenterY) * scale + targetCenterY,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
