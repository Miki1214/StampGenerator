import { getMeshBoundingBox, scaleMeshXY } from "./mesh-bounds";
import type { Mesh } from "./types";

/** Gap left between the drawn design and the base edge on each side (mm). */
export const BASE_DESIGN_PADDING_MM = 3;

/**
 * Scale the static base model's footprint (X/Y only - its thickness/Z is a
 * fixed part of the model and never scaled) to fit the drawn design's actual
 * width/depth in mm.
 *
 * Each axis is scaled independently so a non-square design still fits
 * exactly. The scale factor is clamped to a minimum of `minScale` (default
 * 1x) so the base is never shrunk smaller than its original modeled size -
 * that would risk the static handle's foot overhanging the base's edges
 * once joined.
 */
export function scaleBaseMeshToFootprint(
  base: Mesh,
  targetWidthMm: number,
  targetDepthMm: number,
  minScale = 1,
): Mesh {
  const box = getMeshBoundingBox(base);
  const nativeWidth = box.maxX - box.minX;
  const nativeDepth = box.maxY - box.minY;

  const scaleX = Math.max(targetWidthMm / nativeWidth, minScale);
  const scaleY = Math.max(targetDepthMm / nativeDepth, minScale);
  const pivotX = (box.minX + box.maxX) / 2;
  const pivotY = (box.minY + box.maxY) / 2;

  return scaleMeshXY(base, scaleX, scaleY, pivotX, pivotY);
}
