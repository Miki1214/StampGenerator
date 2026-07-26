import type {
  Mesh,
  PathShapeSet,
  RawPathSet,
  StampOptions,
  SvgPlacementOptions,
  TextImportRequest,
} from "@stamp-generator/geometry-core";
import * as Comlink from "comlink";
import type { ProcessResult } from "./geometry-pipeline-core";
import * as pipelineCore from "./geometry-pipeline-core";

export type { ProcessResult };

export interface GeometryClient {
  warm(): Promise<void>;
  processRaw(raw: RawPathSet): Promise<ProcessResult>;
  processSvg(
    svgText: string,
    placement?: SvgPlacementOptions,
  ): Promise<ProcessResult>;
  processText(request: TextImportRequest): Promise<ProcessResult>;
  buildMesh(shapes: PathShapeSet, options: StampOptions): Promise<Mesh>;
}

/** Same-thread client for tests (no Worker / Comlink). */
export function createInProcessGeometryClient(): GeometryClient {
  return {
    warm: () => pipelineCore.warmPipeline(),
    processRaw: (raw) => pipelineCore.processRawPaths(raw),
    processSvg: (svgText, placement) =>
      pipelineCore.processSvgText(svgText, placement),
    processText: (request) => pipelineCore.processTextRequest(request),
    buildMesh: (shapes, options) =>
      pipelineCore.buildStampMesh(shapes, options),
  };
}

export type GeometryWorkerApi = {
  warm(): Promise<void>;
  processRaw(raw: RawPathSet): Promise<ProcessResult>;
  processSvg(
    svgText: string,
    placement?: SvgPlacementOptions,
  ): Promise<ProcessResult>;
  processText(request: TextImportRequest): Promise<ProcessResult>;
  buildMesh(shapes: PathShapeSet, options: StampOptions): Promise<Mesh>;
};

let sharedWorkerClient: GeometryClient | null = null;

/** Browser client: Comlink RPC to a module worker. Singleton for App warm-up. */
export function createWorkerGeometryClient(): GeometryClient {
  if (sharedWorkerClient) {
    return sharedWorkerClient;
  }

  const worker = new Worker(
    new URL("../workers/geometry.worker.ts", import.meta.url),
    { type: "module" },
  );
  const api = Comlink.wrap<GeometryWorkerApi>(worker);

  sharedWorkerClient = {
    warm: () => api.warm(),
    processRaw: (raw) => api.processRaw(raw),
    processSvg: (svgText, placement) => api.processSvg(svgText, placement),
    processText: (request) => api.processText(request),
    buildMesh: (shapes, options) => api.buildMesh(shapes, options),
  };
  return sharedWorkerClient;
}
