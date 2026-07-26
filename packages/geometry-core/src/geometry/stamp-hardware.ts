import { parseBinaryStl } from "./stl-mesh-importer";
import type { Mesh } from "./types";

export type StampHardwarePart = "handle" | "base";

/** Static STL assets shipped in the repo (see packages/stls/). */
export const STAMP_HARDWARE_FILES: Record<StampHardwarePart, string> = {
  handle: "Handle.stl",
  base: "MinimalBase.stl",
};

export type StampHardwareDataProvider = (
  part: StampHardwarePart,
) => ArrayBuffer;

let hardwareDataProvider: StampHardwareDataProvider | null = null;
const meshCache = new Map<StampHardwarePart, Mesh>();

/** Inject STL bytes (Node tests use fs; the browser uses fetch). */
export function setStampHardwareDataProvider(
  provider: StampHardwareDataProvider,
): void {
  hardwareDataProvider = provider;
  meshCache.clear();
}

export function getStampHardwareMesh(part: StampHardwarePart): Mesh {
  const cached = meshCache.get(part);
  if (cached) {
    return cached;
  }

  if (!hardwareDataProvider) {
    throw new Error(
      "Stamp hardware data provider is not set; call setStampHardwareDataProvider first",
    );
  }

  const mesh = parseBinaryStl(hardwareDataProvider(part));
  meshCache.set(part, mesh);
  return mesh;
}
