import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  BinaryStlExporter,
  FabricCanvasImporter,
  type FabricCanvasLike,
  type Mesh,
  type PathShapeSet,
  type RawPathSet,
  ShapeCleaner,
  ShapeValidator,
  StampGeometryBuilder,
  type StampOptions,
  SvgFileImporter,
  TextOutlineImporter,
  type TextImportRequest,
  type ValidationIssue,
} from "@stamp-generator/geometry-core";
import { triggerDownload } from "../lib/trigger-download";
import { ensureBundledFontsLoaded } from "../lib/bundled-fonts";
import { ensureManifoldReady } from "../lib/manifold-wasm";
import { ensureStampHardwareLoaded } from "../lib/stamp-hardware";

export type PipelineState =
  | { status: "idle" }
  | { status: "importing" }
  | { status: "validating" }
  | { status: "ready"; shapes: PathShapeSet }
  | { status: "invalid"; issues: ValidationIssue[] };

export type PreviewStatus = "idle" | "building" | "ready" | "error";

export interface UseStampPipeline {
  state: PipelineState;
  previewMesh: Mesh | null;
  previewStatus: PreviewStatus;
  importFromSvg(file: File): Promise<PathShapeSet | null>;
  importFromCanvas(canvas: FabricCanvasLike): Promise<PathShapeSet | null>;
  importFromText(request: TextImportRequest): Promise<PathShapeSet | null>;
  buildMesh(
    options: StampOptions,
    shapesOverride?: PathShapeSet,
  ): Promise<Mesh | null>;
  rebuildPreview(
    options: StampOptions,
    shapesOverride?: PathShapeSet,
  ): Promise<Mesh | null>;
  clearPreview(): void;
  exportStl(
    options: StampOptions,
    shapesOverride?: PathShapeSet,
  ): Promise<Uint8Array | null>;
  download(options: StampOptions): void;
}

const DEFAULT_RULES = {
  minFeatureSizeMm: 0.3,
  maxRingCount: 100,
};

const IMPORT_TOLERANCE = 0.1;

function optionsCacheKey(options: StampOptions): string {
  return JSON.stringify(options);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function useStampPipeline(): UseStampPipeline {
  const [state, setState] = useState<PipelineState>({ status: "idle" });
  const [previewMesh, setPreviewMesh] = useState<Mesh | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const stateRef = useRef(state);
  stateRef.current = state;

  const meshCacheRef = useRef<{
    mesh: Mesh;
    optionsKey: string;
    shapes: PathShapeSet;
  } | null>(null);
  const previewGenerationRef = useRef(0);

  const clearPreview = useCallback(() => {
    previewGenerationRef.current += 1;
    meshCacheRef.current = null;
    setPreviewMesh(null);
    setPreviewStatus("idle");
  }, []);

  const processRaw = useCallback(
    async (loadRaw: () => Promise<RawPathSet> | RawPathSet): Promise<PathShapeSet | null> => {
      flushSync(() => {
        setState({ status: "importing" });
      });
      try {
        await ensureManifoldReady();
        const raw = await loadRaw();

        flushSync(() => {
          setState({ status: "validating" });
        });

        const validator = new ShapeValidator();
        const rawResult = validator.validateRaw(raw, DEFAULT_RULES);
        if (!rawResult.ok) {
          setState({ status: "invalid", issues: rawResult.issues });
          return null;
        }

        if (raw.rings.length === 0) {
          setState({
            status: "invalid",
            issues: [
              {
                code: "EMPTY_DESIGN",
                message: "Design is empty — add at least one shape",
              },
            ],
          });
          return null;
        }

        const shapes = new ShapeCleaner().clean(raw);
        const result = validator.validate(shapes, DEFAULT_RULES);
        if (!result.ok) {
          setState({ status: "invalid", issues: result.issues });
          return null;
        }

        setState({ status: "ready", shapes });
        return shapes;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Import failed unexpectedly";
        setState({
          status: "invalid",
          issues: [{ code: "IMPORT_FAILED", message }],
        });
        return null;
      }
    },
    [],
  );

  const importFromSvg = useCallback(
    (file: File) =>
      processRaw(async () => {
        const text = await readFileAsText(file);
        return new SvgFileImporter().import(text, IMPORT_TOLERANCE);
      }),
    [processRaw],
  );

  const importFromCanvas = useCallback(
    (canvas: FabricCanvasLike) =>
      processRaw(() =>
        new FabricCanvasImporter().import(canvas, IMPORT_TOLERANCE),
      ),
    [processRaw],
  );

  const importFromText = useCallback(
    (request: TextImportRequest) =>
      processRaw(async () => {
        await ensureBundledFontsLoaded();
        return new TextOutlineImporter().import(request, IMPORT_TOLERANCE);
      }),
    [processRaw],
  );

  const resolveShapes = useCallback(
    (shapesOverride?: PathShapeSet): PathShapeSet | null => {
      if (shapesOverride) {
        return shapesOverride;
      }
      const current = stateRef.current;
      return current.status === "ready" ? current.shapes : null;
    },
    [],
  );

  const buildMesh = useCallback(
    async (
      options: StampOptions,
      shapesOverride?: PathShapeSet,
    ): Promise<Mesh | null> => {
      const shapes = resolveShapes(shapesOverride);
      if (!shapes) {
        return null;
      }

      const key = optionsCacheKey(options);
      const cached = meshCacheRef.current;
      if (cached && cached.shapes === shapes && cached.optionsKey === key) {
        return cached.mesh;
      }

      await ensureStampHardwareLoaded();
      const mesh = new StampGeometryBuilder().build(shapes, options);
      meshCacheRef.current = { mesh, optionsKey: key, shapes };
      return mesh;
    },
    [resolveShapes],
  );

  const rebuildPreview = useCallback(
    async (
      options: StampOptions,
      shapesOverride?: PathShapeSet,
    ): Promise<Mesh | null> => {
      const shapes = resolveShapes(shapesOverride);
      if (!shapes) {
        clearPreview();
        return null;
      }

      const generation = ++previewGenerationRef.current;
      setPreviewStatus("building");

      try {
        await ensureStampHardwareLoaded();
        if (generation !== previewGenerationRef.current) {
          return null;
        }

        const mesh = new StampGeometryBuilder().build(shapes, options);
        if (generation !== previewGenerationRef.current) {
          return null;
        }

        meshCacheRef.current = {
          mesh,
          optionsKey: optionsCacheKey(options),
          shapes,
        };
        setPreviewMesh(mesh);
        setPreviewStatus("ready");
        return mesh;
      } catch {
        if (generation !== previewGenerationRef.current) {
          return null;
        }
        meshCacheRef.current = null;
        setPreviewMesh(null);
        setPreviewStatus("error");
        return null;
      }
    },
    [clearPreview, resolveShapes],
  );

  const exportStl = useCallback(
    async (
      options: StampOptions,
      shapesOverride?: PathShapeSet,
    ): Promise<Uint8Array | null> => {
      const mesh = await buildMesh(options, shapesOverride);
      if (!mesh) {
        return null;
      }
      return new BinaryStlExporter().export(mesh);
    },
    [buildMesh],
  );

  const download = useCallback(
    (options: StampOptions) => {
      void exportStl(options).then((bytes) => {
        if (!bytes) {
          return;
        }
        triggerDownload(bytes, "stamp.stl");
      });
    },
    [exportStl],
  );

  return {
    state,
    previewMesh,
    previewStatus,
    importFromSvg,
    importFromCanvas,
    importFromText,
    buildMesh,
    rebuildPreview,
    clearPreview,
    exportStl,
    download,
  };
}
