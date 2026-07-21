import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import {
  BinaryStlExporter,
  FabricCanvasImporter,
  type FabricCanvasLike,
  initManifold,
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
  download(options: StampOptions): void;
}

const DEFAULT_RULES = {
  minFeatureSizeMm: 0.5,
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
      await initManifold();
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

      const shapes = new ShapeCleaner().clean(raw);
      const result = validator.validate(shapes, DEFAULT_RULES);
      if (!result.ok) {
        setState({ status: "invalid", issues: result.issues });
        return;
      }

      setState({ status: "ready", shapes });
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
      void processRaw(() =>
        new TextOutlineImporter().import(request, IMPORT_TOLERANCE),
      );
    },
    [processRaw],
  );

  const download = useCallback(
    (options: StampOptions) => {
      if (state.status !== "ready") {
        return;
      }
      const mesh = new StampGeometryBuilder().build(state.shapes, options);
      const bytes = new BinaryStlExporter().export(mesh);
      triggerDownload(bytes, "stamp.stl");
    },
    [state],
  );

  return {
    state,
    importFromSvg,
    importFromCanvas,
    importFromText,
    download,
  };
}
