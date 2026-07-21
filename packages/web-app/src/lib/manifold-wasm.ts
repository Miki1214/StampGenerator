import { initManifold } from "@stamp-generator/geometry-core";
import manifoldWasmUrl from "manifold-3d/manifold.wasm?url";

let ready: Promise<void> | null = null;

/**
 * Initialize manifold-3d with Vite's resolved WASM asset URL.
 * Without locateFile, the browser fetches HTML (SPA fallback) instead of
 * the .wasm binary and fails with "expected magic word 00 61 73 6d".
 */
export function ensureManifoldReady(): Promise<void> {
  if (!ready) {
    ready = initManifold({
      locateFile: () => manifoldWasmUrl,
    });
  }
  return ready;
}
