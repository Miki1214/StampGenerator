import type { PathShapeSet } from "../validate/types";
import { extrudeShapes } from "./extrude";
import { getMeshBoundingBox, translateMesh, translateMeshZ } from "./mesh-bounds";
import { mirrorShapes } from "./mirror";
import { buildRoundBase } from "./round-base";
import { scaleBaseMeshToFootprint } from "./scale-base";
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

    // Size the base to the configured stamp canvas footprint.
    const base =
      opts.baseShape === "round"
        ? buildRoundBase(opts.canvasSizeMm)
        : scaleBaseMeshToFootprint(
            getStampHardwareMesh("base"),
            opts.canvasSizeMm,
            opts.canvasSizeMm,
          );
    const handle = getStampHardwareMesh("handle");

    // The design (the raised, mirrored relief) joins the bottom of the base;
    // the static handle already joins the base's (unscaled) top natively.
    // Center the design on the base's own footprint - the design's canvas
    // coordinates have no relation to where the base/handle model happens to
    // be authored in space, so without this they'd never overlap.
    //
    // When `designFrame` is set (Text mode), use the frame's center so
    // top/bottom/border layout survives this recentering step; otherwise
    // fall back to the design's tight geometry bbox (Draw/SVG).
    const baseBox = getMeshBoundingBox(base);
    const designCenter = designCenterXY(designBox, opts);
    const dx = (baseBox.minX + baseBox.maxX) / 2 - designCenter.x;
    const dy = (baseBox.minY + baseBox.maxY) / 2 - designCenter.y;
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

function designCenterXY(
  designBox: { minX: number; maxX: number; minY: number; maxY: number },
  opts: StampOptions,
): { x: number; y: number } {
  if (!opts.designFrame) {
    return {
      x: (designBox.minX + designBox.maxX) / 2,
      y: (designBox.minY + designBox.maxY) / 2,
    };
  }

  const factor = opts.canvasSizeMm / opts.canvasSizeUnits;
  const frame = opts.designFrame;
  return {
    x: ((frame.minX + frame.maxX) / 2) * factor,
    y: ((frame.minY + frame.maxY) / 2) * factor,
  };
}
