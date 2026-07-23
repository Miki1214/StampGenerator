import { describe, expect, it, vi } from "vitest";
import { StrictMode, createRef } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Path } from "fabric";
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
  __drawingCanvasTestHooks,
} from "../../src/components/DrawingCanvas";

describe("DrawingCanvas", () => {
  it("exposes the live canvas through a ref as FabricCanvasLike", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(
      <DrawingCanvas
        ref={ref}
        baseShape="round"
        canvasSizeMm={50}
        onBaseShapeChange={() => {}}
        onCanvasSizeChange={() => {}}
      />,
    );

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    const canvasArg = ref.current!.getFabricCanvasLike();
    expect(canvasArg).toEqual(
      expect.objectContaining({
        getObjects: expect.any(Function),
      }),
    );
    expect(Array.isArray(canvasArg.getObjects())).toBe(true);
  });

  it("exports drawn stroke points from the ref after a path is added under StrictMode", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(
      <StrictMode>
        <DrawingCanvas
          ref={ref}
          baseShape="round"
          canvasSizeMm={50}
          onBaseShapeChange={() => {}}
          onCanvasSizeChange={() => {}}
        />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()).not.toBeNull();
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas();
    expect(fabricCanvas).not.toBeNull();
    fabricCanvas!.add(
      new Path("M 20 20 Q 60 10 100 40 L 140 80", {
        fill: null,
        stroke: "#000",
        strokeWidth: 8,
      }),
    );

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    const strokes = ref.current!.getFabricCanvasLike().getObjects();
    expect(strokes.length).toBeGreaterThan(0);
    // Stroke is expanded to a closed ribbon outline, not a bare centerline.
    expect(strokes[0].points.length).toBeGreaterThan(4);
    const first = strokes[0].points[0];
    const last = strokes[0].points[strokes[0].points.length - 1];
    expect(first.x).toBeCloseTo(last.x);
    expect(first.y).toBeCloseTo(last.y);
  });

  it("clears drawn strokes when Clear canvas is clicked and notifies onSceneChange", async () => {
    const onSceneChange = vi.fn();
    const ref = createRef<DrawingCanvasHandle>();

    render(
      <DrawingCanvas
        ref={ref}
        baseShape="round"
        canvasSizeMm={50}
        onBaseShapeChange={() => {}}
        onCanvasSizeChange={() => {}}
        onSceneChange={onSceneChange}
      />,
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()).not.toBeNull();
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    fabricCanvas.add(
      new Path("M 20 20 L 100 80", {
        fill: null,
        stroke: "#000",
        strokeWidth: 8,
      }),
    );
    expect(fabricCanvas.getObjects().length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /clear canvas/i }));

    await waitFor(() => {
      expect(fabricCanvas.getObjects()).toHaveLength(0);
    });
    expect(onSceneChange).toHaveBeenCalled();
  });
});
