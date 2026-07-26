/** Pixel extent of the Fabric drawing canvas (square). */
export const DRAWING_CANVAS_SIZE_PX = 400;

/**
 * Shared frame for Design canvas + 3D preview so both columns stay the same
 * size and top-align. Matches Fabric's logical canvas (400px).
 */
export const VIEWPORT_FRAME_CLASSNAME =
  "relative w-full max-w-[400px] aspect-square";
