import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { PathShapeSet, StampOptions } from "@stamp-generator/geometry-core";
import { useDebouncedStampPreview } from "../../src/hooks/useDebouncedStampPreview";
import type { UseStampPipeline } from "../../src/hooks/useStampPipeline";

const OPTIONS: StampOptions = {
  designHeightMm: 2,
  canvasSizeUnits: 400,
  canvasSizeMm: 50,
  baseShape: "round",
  designFrame: { minX: 0, maxX: 400, minY: 0, maxY: 400 },
};

const SHAPES: PathShapeSet = [
  {
    outer: {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    },
    holes: [],
  },
];

function createPipelineMock(): UseStampPipeline {
  return {
    state: { status: "ready", shapes: SHAPES },
    previewMesh: null,
    previewStatus: "idle",
    importFromSvg: vi.fn(),
    importFromCanvas: vi.fn(async () => SHAPES),
    importFromText: vi.fn(),
    buildMesh: vi.fn(),
    rebuildPreview: vi.fn(async () => null),
    clearPreview: vi.fn(),
    exportStl: vi.fn(),
    download: vi.fn(),
  };
}

describe("useDebouncedStampPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not rebuild preview again when options content is unchanged after a successful build", async () => {
    const pipeline = createPipelineMock();
    const canvasRef = {
      current: {
        getFabricCanvasLike: () => ({
          getObjects: () => [{ type: "path" }],
        }),
      },
    };

    const { rerender } = renderHook(
      ({ options }) =>
        useDebouncedStampPreview({
          options,
          drawingCanvasRef: canvasRef as never,
          pipeline,
        }),
      { initialProps: { options: { ...OPTIONS } } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(pipeline.rebuildPreview).toHaveBeenCalledTimes(1);

    // New object identity, same content — must not schedule another rebuild.
    rerender({ options: { ...OPTIONS } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(pipeline.rebuildPreview).toHaveBeenCalledTimes(1);
    expect(pipeline.importFromCanvas).toHaveBeenCalledTimes(1);
  });
});
