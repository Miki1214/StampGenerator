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
export { initManifold, ShapeCleaner } from "./validate/shape-cleaner";
export { ShapeValidator } from "./validate/shape-validator";
export type {
  PathShapeSet,
  PolygonWithHoles,
  Ring,
  ValidationIssue,
  ValidationResult,
  ValidationRules,
} from "./validate/types";
