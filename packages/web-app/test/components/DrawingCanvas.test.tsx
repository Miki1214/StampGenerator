import { describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Path } from "fabric";
import {
  DrawingCanvas,
  __drawingCanvasTestHooks,
} from "../../src/components/DrawingCanvas";

describe("DrawingCanvas", () => {
  it("calls onImport with a FabricCanvasLike when the import drawing control is clicked", () => {
    const onImport = vi.fn();

    render(
      <DrawingCanvas
        onImport={onImport}
        baseShape="square"
        canvasSizeMm={50}
        onBaseShapeChange={() => {}}
        onCanvasSizeChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /import drawing/i }));

    expect(onImport).toHaveBeenCalledTimes(1);
    const canvasArg = onImport.mock.calls[0][0];
    expect(canvasArg).toEqual(
      expect.objectContaining({
        getObjects: expect.any(Function),
      }),
    );
    expect(Array.isArray(canvasArg.getObjects())).toBe(true);
  });

  it("exports drawn stroke points after a path is added under StrictMode", async () => {
    const onImport = vi.fn();

    render(
      <StrictMode>
        <DrawingCanvas
          onImport={onImport}
          baseShape="square"
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

    fireEvent.click(screen.getByRole("button", { name: /import drawing/i }));

    expect(onImport).toHaveBeenCalledTimes(1);
    const strokes = onImport.mock.calls[0][0].getObjects();
    expect(strokes.length).toBeGreaterThan(0);
    // Stroke is expanded to a closed ribbon outline, not a bare centerline.
    expect(strokes[0].points.length).toBeGreaterThan(4);
    const first = strokes[0].points[0];
    const last = strokes[0].points[strokes[0].points.length - 1];
    expect(first.x).toBeCloseTo(last.x);
    expect(first.y).toBeCloseTo(last.y);
  });
});
