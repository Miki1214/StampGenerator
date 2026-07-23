import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  initManifold,
  setStampHardwareDataProvider,
  STAMP_HARDWARE_FILES,
  type StampHardwarePart,
  type StampOptions,
} from "@stamp-generator/geometry-core";
import { useStampPipeline } from "../../src/hooks/useStampPipeline";
import { DRAWING_CANVAS_SIZE_PX } from "../../src/lib/drawing-canvas";

vi.mock("../../src/lib/stamp-hardware", () => ({
  ensureStampHardwareLoaded: async () => undefined,
}));

const stlsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../stls",
);

const OPTIONS: StampOptions = {
  designHeightMm: 2,
  canvasSizeUnits: DRAWING_CANVAS_SIZE_PX,
  canvasSizeMm: 50,
  baseShape: "square",
};

describe("useStampPipeline mesh preview", () => {
  beforeAll(async () => {
    await initManifold();
    setStampHardwareDataProvider((part: StampHardwarePart) => {
      const bytes = readFileSync(join(stlsDir, STAMP_HARDWARE_FILES[part]));
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
    });
  });

  it("rebuildPreview builds a full-assembly mesh after a successful SVG import", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="30" height="40" />
    </svg>`;
    const file = new File([svg], "clean.svg", { type: "image/svg+xml" });

    const { result } = renderHook(() => useStampPipeline());

    await act(async () => {
      await result.current.importFromSvg(file);
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("ready");
    });

    await act(async () => {
      await result.current.rebuildPreview(OPTIONS);
    });

    expect(result.current.previewStatus).toBe("ready");
    expect(result.current.previewMesh).toBeTruthy();
    expect(result.current.previewMesh!.vertices.length).toBeGreaterThan(0);
    expect(result.current.previewMesh!.triangleIndices.length).toBeGreaterThan(
      0,
    );
  });

  it("exportStl reuses the cached mesh from rebuildPreview", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="30" height="40" />
    </svg>`;
    const file = new File([svg], "clean.svg", { type: "image/svg+xml" });

    const { result } = renderHook(() => useStampPipeline());

    await act(async () => {
      await result.current.importFromSvg(file);
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("ready");
    });

    let firstMesh = null as Awaited<
      ReturnType<(typeof result.current)["rebuildPreview"]>
    >;

    await act(async () => {
      firstMesh = await result.current.rebuildPreview(OPTIONS);
    });

    const bytes = await act(async () => result.current.exportStl(OPTIONS));

    expect(bytes).toBeTruthy();
    expect(bytes!.byteLength).toBeGreaterThan(84);

    const reused = await act(async () => result.current.buildMesh(OPTIONS));
    expect(reused).toBe(firstMesh);
  });
});
