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
export {
  TextOutlineImporter,
  BUNDLED_FONT_FILES,
  setBundledFontDataProvider,
  type BundledFontDataProvider,
} from "./import/text-outline-importer";
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
export { unionMeshes } from "./geometry/union";
export { StampGeometryBuilder } from "./geometry/stamp-geometry-builder";
export type { Mesh, StampOptions } from "./geometry/types";
export {
  BinaryStlExporter,
  type MeshExporter,
} from "./export/binary-stl-exporter";
