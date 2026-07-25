import { describe, expect, it, vi } from "vitest";
import { StrictMode, createRef } from "react";
import { render, waitFor } from "@testing-library/react";
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
      <DrawingCanvas ref={ref} baseShape="round" />,
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
        <DrawingCanvas ref={ref} baseShape="round" />
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

  it("exports filled outline polygons without stroke expansion", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(
      <DrawingCanvas ref={ref} baseShape="round" />,
    );

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes([
      {
        outer: {
          points: [
            { x: 10, y: 10 },
            { x: 50, y: 10 },
            { x: 50, y: 40 },
            { x: 10, y: 40 },
          ],
        },
        holes: [],
      },
    ]);

    await waitFor(() => {
      const objects = ref.current!.getFabricCanvasLike().getObjects();
      expect(objects.length).toBe(1);
    });

    const exported = ref.current!.getFabricCanvasLike().getObjects()[0];
    // Filled outline keeps ~4 corners (+ optional close), not a stroke ribbon.
    expect(exported.points.length).toBeLessThan(10);
    const xs = exported.points.map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(10, 0);
    expect(Math.max(...xs)).toBeCloseTo(50, 0);
  });

  it("clears drawn strokes via ref.clear() and notifies onSceneChange", async () => {
    const onSceneChange = vi.fn();
    const ref = createRef<DrawingCanvasHandle>();

    render(
      <DrawingCanvas
        ref={ref}
        baseShape="round"
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

    ref.current!.clear();

    await waitFor(() => {
      expect(fabricCanvas.getObjects()).toHaveLength(0);
    });
    expect(onSceneChange).toHaveBeenCalled();
  });

  it("removes only polygons tagged with a given svgId", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(<DrawingCanvas ref={ref} baseShape="round" />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    const shape = {
      outer: {
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 10 },
          { x: 50, y: 40 },
          { x: 10, y: 40 },
        ],
      },
      holes: [],
    };

    ref.current!.addOutlineShapes([shape], { svgId: "keep" });
    ref.current!.addOutlineShapes([shape], { svgId: "drop" });

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()?.getObjects().length).toBe(2);
    });

    ref.current!.removeBySvgId("drop");

    await waitFor(() => {
      const objects = __drawingCanvasTestHooks.getCanvas()?.getObjects() ?? [];
      expect(objects).toHaveLength(1);
      expect(
        (objects[0] as { stampSvgId?: string }).stampSvgId,
      ).toBe("keep");
    });
  });
});
