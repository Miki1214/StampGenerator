import type { Vec2 } from "manifold-3d";
import type { PathShapeSet } from "../validate/types";
import { getManifold } from "../validate/shape-cleaner";
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
      const manifoldMesh = solid.getMesh();
      return meshFromManifold(manifoldMesh);
    } finally {
      solid.delete();
    }
  } finally {
    crossSection.delete();
  }
}

function meshFromManifold(manifoldMesh: {
  numProp: number;
  vertProperties: Float32Array;
  triVerts: Uint32Array;
}): Mesh {
  const { numProp, vertProperties, triVerts } = manifoldMesh;
  const vertexCount = vertProperties.length / numProp;
  const vertices = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    const src = i * numProp;
    const dst = i * 3;
    vertices[dst] = vertProperties[src];
    vertices[dst + 1] = vertProperties[src + 1];
    vertices[dst + 2] = vertProperties[src + 2];
  }

  return {
    vertices,
    triangleIndices: new Uint32Array(triVerts),
  };
}
