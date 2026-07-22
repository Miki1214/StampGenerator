import type { PathShapeSet } from "../validate/types";
import { extrudeShapes } from "./extrude";
import { getMeshBoundingBox, translateMesh, translateMeshZ } from "./mesh-bounds";
import { mirrorShapes } from "./mirror";
import {
  BASE_DESIGN_PADDING_MM,
  scaleBaseMeshToFootprint,
} from "./scale-base";
import { scaleToMm } from "./scale";
import { getStampHardwareMesh } from "./stamp-hardware";
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
    const design = extrudeShapes(mirrored, opts.designHeightMm);
    const designBox = getMeshBoundingBox(design);

    // Size the base to the drawn design's footprint plus padding on each side.
    const designWidthMm = designBox.maxX - designBox.minX;
    const designDepthMm = designBox.maxY - designBox.minY;
    const padding = BASE_DESIGN_PADDING_MM * 2;
    const base = scaleBaseMeshToFootprint(
      getStampHardwareMesh("base"),
      designWidthMm + padding,
      designDepthMm + padding,
    );
    const handle = getStampHardwareMesh("handle");

    // The design (the raised, mirrored relief) joins the bottom of the base;
    // the static handle already joins the base's (unscaled) top natively.
    // Center the design on the base's own footprint - the design's canvas
    // coordinates have no relation to where the base/handle model happens to
    // be authored in space, so without this they'd never overlap.
    const baseBox = getMeshBoundingBox(base);
    const dx = (baseBox.minX + baseBox.maxX) / 2 - (designBox.minX + designBox.maxX) / 2;
    const dy = (baseBox.minY + baseBox.maxY) / 2 - (designBox.minY + designBox.maxY) / 2;
    const dz = baseBox.minZ - opts.designHeightMm - designBox.minZ;
    const positionedDesign = translateMesh(design, dx, dy, dz);

    const assembled = unionMeshes(
      unionMeshes(positionedDesign, base),
      handle,
    );

    // Normalize so the whole stamp sits on the print bed at Z=0.
    const assembledBox = getMeshBoundingBox(assembled);
    return translateMeshZ(assembled, -assembledBox.minZ);
  }
}
