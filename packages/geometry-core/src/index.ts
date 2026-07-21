export { isPipelineGateReady } from "./pipeline-gate";
export type {
  BundledFontId,
  Point2D,
  RawPathSet,
  RawRing,
  ShapeImporter,
  TextImportRequest,
} from "./import/types";
export { flattenArc, flattenCubicBezier } from "./import/curve-flatten";
export { SvgFileImporter } from "./import/svg-file-importer";
export {
  FabricCanvasImporter,
  type FabricCanvasLike,
  type FabricStrokeLike,
} from "./import/fabric-canvas-importer";
export { TextOutlineImporter } from "./import/text-outline-importer";
export { initManifold, getManifold, ShapeCleaner } from "./validate/shape-cleaner";
export { ShapeValidator } from "./validate/shape-validator";
export type {
  PathShapeSet,
  PolygonWithHoles,
  Ring,
  ValidationIssue,
  ValidationResult,
  ValidationRules,
} from "./validate/types";
export { mirrorShapes } from "./geometry/mirror";
export { scaleToMm } from "./geometry/scale";
export { extrudeShapes } from "./geometry/extrude";
export { buildBasePlate } from "./geometry/base-plate";
export type { Mesh, StampOptions } from "./geometry/types";
