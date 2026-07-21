import type { PathShapeSet } from "../validate/types";
import { buildBasePlate } from "./base-plate";
import { extrudeShapes } from "./extrude";
import { mirrorShapes } from "./mirror";
import { scaleToMm } from "./scale";
import type {
  Mesh,
  StampGeometryBuilder as StampGeometryBuilderContract,
  StampOptions,
} from "./types";
import { unionMeshes } from "./union";

export class StampGeometryBuilder implements StampGeometryBuilderContract {
  build(shapes: PathShapeSet, opts: StampOptions): Mesh {
    const scaled = scaleToMm(shapes, opts);
    const mirrored = mirrorShapes(scaled);
    const design = translateMeshZ(
      extrudeShapes(mirrored, opts.designHeightMm),
      opts.baseThicknessMm,
    );
    const base = buildBasePlate(opts.canvasSizeMm, opts.baseThicknessMm);
    return unionMeshes(base, design);
  }
}

function translateMeshZ(mesh: Mesh, dz: number): Mesh {
  const vertices = new Float32Array(mesh.vertices);
  for (let i = 2; i < vertices.length; i += 3) {
    vertices[i] += dz;
  }
  return {
    vertices,
    triangleIndices: mesh.triangleIndices,
  };
}
