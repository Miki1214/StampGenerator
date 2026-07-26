export interface Point2DLike {
  x: number;
  y: number;
}

export interface CenterSnapResult extends Point2DLike {
  snappedX: boolean;
  snappedY: boolean;
}

/** Default pixel tolerance for snapping an object's center to a guide line. */
export const SNAP_TOLERANCE_PX = 8;

/**
 * Snaps a dragged object's center to the canvas's horizontal/vertical
 * mid-lines when within `tolerancePx`, mirroring Instagram-style guide
 * snapping. Each axis snaps independently, so a center near both mid-lines
 * lands exactly on their crossing point (the canvas center).
 */
export function snapCenterToCanvasMiddle(
  center: Point2DLike,
  canvasCenter: Point2DLike,
  tolerancePx: number = SNAP_TOLERANCE_PX,
): CenterSnapResult {
  const snappedX = Math.abs(center.x - canvasCenter.x) <= tolerancePx;
  const snappedY = Math.abs(center.y - canvasCenter.y) <= tolerancePx;

  return {
    x: snappedX ? canvasCenter.x : center.x,
    y: snappedY ? canvasCenter.y : center.y,
    snappedX,
    snappedY,
  };
}

export interface AngleSnapResult {
  angle: number;
  snapped: boolean;
}

/** Default degree tolerance for snapping a rotation to a cardinal angle. */
export const ROTATION_SNAP_TOLERANCE_DEG = 5;

/** Cardinal orientations a rotate handle snaps to, mirroring Instagram's rotate-to-horizontal guide. */
export const CARDINAL_ANGLES = [0, 90, 180, 270] as const;

/**
 * Snaps a rotation angle (degrees) to the nearest cardinal orientation
 * (0/90/180/270) when within `toleranceDeg`. Handles wraparound so an angle
 * near 360 snaps to 0.
 */
export function snapAngleToCardinal(
  angle: number,
  toleranceDeg: number = ROTATION_SNAP_TOLERANCE_DEG,
): AngleSnapResult {
  const normalized = ((angle % 360) + 360) % 360;

  for (const cardinal of CARDINAL_ANGLES) {
    const diff = Math.min(
      Math.abs(normalized - cardinal),
      360 - Math.abs(normalized - cardinal),
    );
    if (diff <= toleranceDeg) {
      return { angle: cardinal, snapped: true };
    }
  }

  return { angle, snapped: false };
}
