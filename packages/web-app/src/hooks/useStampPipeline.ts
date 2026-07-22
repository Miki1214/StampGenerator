import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import {
  BinaryStlExporter,
  FabricCanvasImporter,
  type FabricCanvasLike,
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

export interface UseStampPipeline {
  state: PipelineState;
  importFromSvg(file: File): void;
  importFromCanvas(canvas: FabricCanvasLike): void;
  importFromText(request: TextImportRequest): void;
  exportStl(options: StampOptions): Promise<Uint8Array | null>;
  download(options: StampOptions): void;
}

const DEFAULT_RULES = {
  minFeatureSizeMm: 0.3,
  maxRingCount: 100,
};

const IMPORT_TOLERANCE = 0.1;

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

  const processRaw = useCallback(
    async (loadRaw: () => Promise<RawPathSet> | RawPathSet) => {
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
          return;
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
          return;
        }

        const shapes = new ShapeCleaner().clean(raw);
        const result = validator.validate(shapes, DEFAULT_RULES);
        if (!result.ok) {
          setState({ status: "invalid", issues: result.issues });
          return;
        }

        setState({ status: "ready", shapes });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Import failed unexpectedly";
        setState({
          status: "invalid",
          issues: [{ code: "IMPORT_FAILED", message }],
        });
      }
    },
    [],
  );

  const importFromSvg = useCallback(
    (file: File) => {
      void processRaw(async () => {
        const text = await readFileAsText(file);
        return new SvgFileImporter().import(text, IMPORT_TOLERANCE);
      });
    },
    [processRaw],
  );

  const importFromCanvas = useCallback(
    (canvas: FabricCanvasLike) => {
      void processRaw(() =>
        new FabricCanvasImporter().import(canvas, IMPORT_TOLERANCE),
      );
    },
    [processRaw],
  );

  const importFromText = useCallback(
    (request: TextImportRequest) => {
      void processRaw(async () => {
        await ensureBundledFontsLoaded();
        return new TextOutlineImporter().import(request, IMPORT_TOLERANCE);
      });
    },
    [processRaw],
  );

  const exportStl = useCallback(
    async (options: StampOptions): Promise<Uint8Array | null> => {
      if (state.status !== "ready") {
        return null;
      }
      await ensureStampHardwareLoaded();
      const mesh = new StampGeometryBuilder().build(state.shapes, options);
      return new BinaryStlExporter().export(mesh);
    },
    [state],
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
    importFromSvg,
    importFromCanvas,
    importFromText,
    exportStl,
    download,
  };
}
