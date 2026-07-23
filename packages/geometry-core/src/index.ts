export { isPipelineGateReady } from "./pipeline-gate";
export type {
  BundledFontId,
  Point2D,
  RawPathSet,
  RawRing,
  ShapeImporter,
  TextImportRequest,
  TextLineAlign,
  TextVerticalAlign,
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
export {
  layoutText,
  transformLocalPoint,
  splitLines,
  type GlyphPlacement,
  type LaidOutGlyph,
  type TextLayoutResult,
} from "./import/text-layout";
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
export {
  BASE_DESIGN_PADDING_MM,
  scaleBaseMeshToFootprint,
} from "./geometry/scale-base";
export {
  getMeshBoundingBox,
  translateMesh,
  translateMeshZ,
  scaleMeshXY,
  type MeshBoundingBox,
} from "./geometry/mesh-bounds";
export { parseBinaryStl } from "./geometry/stl-mesh-importer";
export {
  STAMP_HARDWARE_FILES,
  setStampHardwareDataProvider,
  getStampHardwareMesh,
  type StampHardwarePart,
  type StampHardwareDataProvider,
} from "./geometry/stamp-hardware";
export {
  buildRoundBase,
  NATIVE_BASE_CENTER,
  NATIVE_BASE_THICKNESS_MM,
} from "./geometry/round-base";
export { unionMeshes } from "./geometry/union";
export { StampGeometryBuilder } from "./geometry/stamp-geometry-builder";
export {
  STAMP_CANVAS_SIZES_MM,
  STAMP_ROUND_DIAMETERS_MM,
  type StampBaseShape,
  type StampCanvasSizeMm,
  type StampRoundDiameterMm,
} from "./geometry/types";
export type { DesignFrame, Mesh, StampOptions } from "./geometry/types";
export {
  BinaryStlExporter,
  type MeshExporter,
} from "./export/binary-stl-exporter";
