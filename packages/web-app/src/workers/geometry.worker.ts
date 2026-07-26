import * as Comlink from "comlink";
import type {
  Mesh,
  PathShapeSet,
  RawPathSet,
  StampOptions,
  SvgPlacementOptions,
  TextImportRequest,
} from "@stamp-generator/geometry-core";
import {
  buildStampMesh,
  processRawPaths,
  processSvgText,
  processTextRequest,
  warmPipeline,
  type ProcessResult,
} from "../lib/geometry-pipeline-core";

const api = {
  warm(): Promise<void> {
    return warmPipeline();
  },

  processRaw(raw: RawPathSet): Promise<ProcessResult> {
    return processRawPaths(raw);
  },

  processSvg(
    svgText: string,
    placement?: SvgPlacementOptions,
  ): Promise<ProcessResult> {
    return processSvgText(svgText, placement);
  },

  processText(request: TextImportRequest): Promise<ProcessResult> {
    return processTextRequest(request);
  },

  async buildMesh(
    shapes: PathShapeSet,
    options: StampOptions,
  ): Promise<Mesh> {
    const mesh = await buildStampMesh(shapes, options);
    return Comlink.transfer(mesh, [
      mesh.vertices.buffer,
      mesh.triangleIndices.buffer,
    ]);
  },
};

Comlink.expose(api);

export type GeometryWorkerExposed = typeof api;
