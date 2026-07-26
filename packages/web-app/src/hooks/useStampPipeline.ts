import { useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  BinaryStlExporter,
  FabricCanvasImporter,
  type FabricCanvasLike,
  type Mesh,
  type PathShapeSet,
  type StampOptions,
  type SvgPlacementOptions,
  type TextImportRequest,
  type ValidationIssue,
} from "@stamp-generator/geometry-core";
import {
  createWorkerGeometryClient,
  type GeometryClient,
} from "../lib/geometry-client";
import {
  createLatestOnlyQueue,
  LatestOnlySupersededError,
} from "../lib/latest-only-queue";
import { triggerDownload } from "../lib/trigger-download";

export type PipelineState =
  | { status: "idle" }
  | { status: "importing" }
  | { status: "validating" }
  | { status: "ready"; shapes: PathShapeSet; warnings?: ValidationIssue[] }
  | { status: "invalid"; issues: ValidationIssue[] };

export type PreviewStatus = "idle" | "building" | "ready" | "error";

export interface UseStampPipeline {
  state: PipelineState;
  previewMesh: Mesh | null;
  previewStatus: PreviewStatus;
  importFromSvg(
    file: File,
    placement?: SvgPlacementOptions,
  ): Promise<PathShapeSet | null>;
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

const IMPORT_TOLERANCE = 0.1;

function optionsCacheKey(options: StampOptions): string {
  return JSON.stringify(options);
}

function meshContentKey(options: StampOptions, shapes: PathShapeSet): string {
  return `${optionsCacheKey(options)}|${JSON.stringify(shapes)}`;
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

export function useStampPipeline(
  client: GeometryClient = createWorkerGeometryClient(),
): UseStampPipeline {
  const [state, setState] = useState<PipelineState>({ status: "idle" });
  const [previewMesh, setPreviewMesh] = useState<Mesh | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const stateRef = useRef(state);
  stateRef.current = state;
  const clientRef = useRef(client);
  clientRef.current = client;

  const meshCacheRef = useRef<{
    mesh: Mesh;
    contentKey: string;
  } | null>(null);
  const previewGenerationRef = useRef(0);

  const clearPreview = useCallback(() => {
    previewGenerationRef.current += 1;
    meshCacheRef.current = null;
    setPreviewMesh(null);
    setPreviewStatus("idle");
  }, []);

  const applyProcessResult = useCallback(
    (
      result: Awaited<ReturnType<GeometryClient["processRaw"]>>,
    ): PathShapeSet | null => {
      if (!result.ok) {
        setState({ status: "invalid", issues: result.issues });
        return null;
      }
      setState({
        status: "ready",
        shapes: result.shapes,
        ...(result.warnings?.length ? { warnings: result.warnings } : {}),
      });
      return result.shapes;
    },
    [],
  );

  const importFromSvg = useCallback(
    async (
      file: File,
      placement?: SvgPlacementOptions,
    ): Promise<PathShapeSet | null> => {
      flushSync(() => {
        setState({ status: "importing" });
      });
      try {
        const text = await readFileAsText(file);
        flushSync(() => {
          setState({ status: "validating" });
        });
        const result = await clientRef.current.processSvg(text, placement);
        return applyProcessResult(result);
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
    [applyProcessResult],
  );

  const importFromCanvas = useCallback(
    async (canvas: FabricCanvasLike): Promise<PathShapeSet | null> => {
      flushSync(() => {
        setState({ status: "importing" });
      });
      try {
        // Fabric extraction stays on the main thread (needs the live canvas).
        const raw = new FabricCanvasImporter().import(canvas, IMPORT_TOLERANCE);
        flushSync(() => {
          setState({ status: "validating" });
        });
        const result = await clientRef.current.processRaw(raw);
        return applyProcessResult(result);
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
    [applyProcessResult],
  );

  const importFromText = useCallback(
    async (request: TextImportRequest): Promise<PathShapeSet | null> => {
      flushSync(() => {
        setState({ status: "importing" });
      });
      try {
        flushSync(() => {
          setState({ status: "validating" });
        });
        const result = await clientRef.current.processText(request);
        return applyProcessResult(result);
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
    [applyProcessResult],
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

      const contentKey = meshContentKey(options, shapes);
      const cached = meshCacheRef.current;
      if (cached && cached.contentKey === contentKey) {
        return cached.mesh;
      }

      const mesh = await clientRef.current.buildMesh(shapes, options);
      meshCacheRef.current = { mesh, contentKey };
      return mesh;
    },
    [resolveShapes],
  );

  const previewQueue = useMemo(
    () =>
      createLatestOnlyQueue(
        async (job: {
          generation: number;
          options: StampOptions;
          shapes: PathShapeSet;
          contentKey: string;
        }) => {
          const mesh = await clientRef.current.buildMesh(
            job.shapes,
            job.options,
          );
          if (job.generation !== previewGenerationRef.current) {
            return null;
          }
          meshCacheRef.current = { mesh, contentKey: job.contentKey };
          setPreviewMesh(mesh);
          setPreviewStatus("ready");
          return mesh;
        },
      ),
    [],
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

      const contentKey = meshContentKey(options, shapes);
      const cached = meshCacheRef.current;
      if (cached && cached.contentKey === contentKey) {
        setPreviewMesh(cached.mesh);
        setPreviewStatus("ready");
        return cached.mesh;
      }

      const generation = ++previewGenerationRef.current;
      setPreviewStatus("building");

      try {
        return await previewQueue.enqueue({
          generation,
          options,
          shapes,
          contentKey,
        });
      } catch (error) {
        if (error instanceof LatestOnlySupersededError) {
          return null;
        }
        if (generation !== previewGenerationRef.current) {
          return null;
        }
        meshCacheRef.current = null;
        setPreviewMesh(null);
        setPreviewStatus("error");
        return null;
      }
    },
    [clearPreview, previewQueue, resolveShapes],
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
