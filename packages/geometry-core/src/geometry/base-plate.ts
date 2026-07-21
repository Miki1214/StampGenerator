import { getManifold } from "../validate/shape-cleaner";
import { meshFromManifold } from "./mesh-from-manifold";
import type { Mesh } from "./types";

export function buildBasePlate(
  canvasSizeMm: number,
  thicknessMm: number,
): Mesh {
  const wasm = getManifold();
  const solid = wasm.Manifold.cube([canvasSizeMm, canvasSizeMm, thicknessMm]);
  try {
    return meshFromManifold(solid.getMesh());
  } finally {
    solid.delete();
  }
}
