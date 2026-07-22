import { getManifold } from "../validate/shape-cleaner";
import { meshFromManifold } from "./mesh-from-manifold";
import { translateMesh } from "./mesh-bounds";
import type { Mesh } from "./types";

/** Matches the bundled MinimalBase.stl thickness (mm). */
export const NATIVE_BASE_THICKNESS_MM = 5;

/**
 * XY center of the static square base/handle assembly in model space. The
 * round base is offset here so the unchanged handle still mates correctly.
 */
export const NATIVE_BASE_CENTER = { x: 2.5, y: 0 };

/** Build a cylindrical stamp base with the same thickness as MinimalBase.stl. */
export function buildRoundBase(
  diameterMm: number,
  circularSegments = 96,
): Mesh {
  const wasm = getManifold();
  const radius = diameterMm / 2;
  const solid = wasm.Manifold.cylinder(
    NATIVE_BASE_THICKNESS_MM,
    radius,
    radius,
    circularSegments,
    false,
  );
  try {
    const mesh = meshFromManifold(solid.getMesh());
    return translateMesh(
      mesh,
      NATIVE_BASE_CENTER.x,
      NATIVE_BASE_CENTER.y,
      0,
    );
  } finally {
    solid.delete();
  }
}
