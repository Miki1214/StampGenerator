import {
  placePathsInFrame,
  ShapeCleaner,
  ShapeValidator,
  StampGeometryBuilder,
  SvgFileImporter,
  TextOutlineImporter,
  type Mesh,
  type PathShapeSet,
  type RawPathSet,
  type StampOptions,
  type SvgPlacementOptions,
  type TextImportRequest,
  type ValidationIssue,
} from "@stamp-generator/geometry-core";
import { ensureBundledFontsLoaded } from "./bundled-fonts";
import { ensureManifoldReady } from "./manifold-wasm";
import { ensureStampHardwareLoaded } from "./stamp-hardware";

const DEFAULT_RULES = {
  minFeatureSizeMm: 0.3,
  maxRingCount: 2000,
};

const IMPORT_TOLERANCE = 0.1;

/** Shared builder so base+handle union cache survives across builds. */
const builder = new StampGeometryBuilder();

export type ProcessResult =
  | { ok: true; shapes: PathShapeSet; warnings?: ValidationIssue[] }
  | { ok: false; issues: ValidationIssue[] };

export async function warmPipeline(): Promise<void> {
  await Promise.all([
    ensureManifoldReady(),
    ensureStampHardwareLoaded(),
    ensureBundledFontsLoaded(),
  ]);
}

export async function processRawPaths(raw: RawPathSet): Promise<ProcessResult> {
  await ensureManifoldReady();

  const validator = new ShapeValidator();
  const rawResult = validator.validateRaw(raw, DEFAULT_RULES);
  if (!rawResult.ok) {
    return { ok: false, issues: rawResult.issues };
  }

  if (raw.rings.length === 0) {
    return {
      ok: false,
      issues: [
        {
          code: "EMPTY_DESIGN",
          message: "Design is empty — add at least one shape",
        },
      ],
    };
  }

  const shapes = new ShapeCleaner().clean(raw);
  const result = validator.validate(shapes, DEFAULT_RULES);
  if (!result.ok) {
    return { ok: false, issues: result.issues };
  }

  return {
    ok: true,
    shapes,
    ...(result.warnings?.length ? { warnings: result.warnings } : {}),
  };
}

export async function processSvgText(
  svgText: string,
  placement?: SvgPlacementOptions,
): Promise<ProcessResult> {
  try {
    const raw = new SvgFileImporter().import(svgText, IMPORT_TOLERANCE);
    const placed = placement ? placePathsInFrame(raw, placement) : raw;
    return processRawPaths(placed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import failed unexpectedly";
    return {
      ok: false,
      issues: [{ code: "IMPORT_FAILED", message }],
    };
  }
}

export async function processTextRequest(
  request: TextImportRequest,
): Promise<ProcessResult> {
  try {
    await ensureBundledFontsLoaded();
    const raw = new TextOutlineImporter().import(request, IMPORT_TOLERANCE);
    return processRawPaths(raw);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import failed unexpectedly";
    return {
      ok: false,
      issues: [{ code: "IMPORT_FAILED", message }],
    };
  }
}

export async function buildStampMesh(
  shapes: PathShapeSet,
  options: StampOptions,
): Promise<Mesh> {
  await ensureStampHardwareLoaded();
  return builder.build(shapes, options);
}
