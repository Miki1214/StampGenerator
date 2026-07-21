import type { Vec2 } from "manifold-3d";
import type { PathShapeSet } from "../validate/types";
import { getManifold } from "../validate/shape-cleaner";
import { meshFromManifold } from "./mesh-from-manifold";
import type { Mesh } from "./types";

export function extrudeShapes(shapes: PathShapeSet, heightMm: number): Mesh {
  const wasm = getManifold();

  const contours: Vec2[][] = [];
  for (const shape of shapes) {
    contours.push(shape.outer.points.map((p): Vec2 => [p.x, p.y]));
    for (const hole of shape.holes) {
      contours.push(hole.points.map((p): Vec2 => [p.x, p.y]));
    }
  }

  const crossSection = wasm.CrossSection.ofPolygons(contours, "NonZero");
  try {
    const solid = wasm.Manifold.extrude(crossSection, heightMm);
    try {
      return meshFromManifold(solid.getMesh());
    } finally {
      solid.delete();
    }
  } finally {
    crossSection.delete();
  }
}
