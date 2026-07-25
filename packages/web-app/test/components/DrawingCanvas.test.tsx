import { describe, expect, it, vi } from "vitest";
import { StrictMode, createRef } from "react";
import { render, waitFor, fireEvent, screen } from "@testing-library/react";
import { Path, Point } from "fabric";
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

  it("adds an SVG import as a selectable group with borders, rotate enabled, and scale locked", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(<DrawingCanvas ref={ref} baseShape="round" />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
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
      ],
      { svgId: "star" },
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()?.getObjects().length).toBe(1);
    });

    const group = __drawingCanvasTestHooks.getCanvas()!.getObjects()[0] as {
      type?: string;
      stampSvgId?: string;
      selectable?: boolean;
      evented?: boolean;
      hasBorders?: boolean;
      hasControls?: boolean;
      lockScalingX?: boolean;
      lockScalingY?: boolean;
      lockRotation?: boolean;
      isControlVisible?: (key: string) => boolean;
    };

    expect(group.type).toBe("group");
    expect(group.stampSvgId).toBe("star");
    expect(group.selectable).toBe(true);
    expect(group.evented).toBe(true);
    expect(group.hasBorders).toBe(true);
    expect(group.hasControls).toBe(true);
    expect(group.lockScalingX).toBe(true);
    expect(group.lockScalingY).toBe(true);
    expect(group.lockRotation).toBe(false);

    expect(group.isControlVisible?.("mtr")).toBe(true);
    expect(group.isControlVisible?.("tl")).toBe(false);
    expect(group.isControlVisible?.("tr")).toBe(false);
    expect(group.isControlVisible?.("bl")).toBe(false);
    expect(group.isControlVisible?.("br")).toBe(false);
    expect(group.isControlVisible?.("ml")).toBe(false);
    expect(group.isControlVisible?.("mr")).toBe(false);
    expect(group.isControlVisible?.("mt")).toBe(false);
    expect(group.isControlVisible?.("mb")).toBe(false);
  });

  it("exports SVG group points shifted after the group is dragged", async () => {
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
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
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
      ],
      { svgId: "square" },
    );

    await waitFor(() => {
      expect(ref.current!.getFabricCanvasLike().getObjects().length).toBe(1);
    });

    const before = ref.current!.getFabricCanvasLike().getObjects()[0].points;
    const beforeMinX = Math.min(...before.map((p) => p.x));

    onSceneChange.mockClear();

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    const group = fabricCanvas.getObjects()[0];
    group.set({ left: (group.left ?? 0) + 40, top: group.top ?? 0 });
    group.setCoords();
    fabricCanvas.fire("object:modified", { target: group });

    const after = ref.current!.getFabricCanvasLike().getObjects()[0].points;
    const afterMinX = Math.min(...after.map((p) => p.x));

    expect(afterMinX).toBeCloseTo(beforeMinX + 40, 0);
    expect(onSceneChange).toHaveBeenCalled();
  });

  it("exports SVG group points rotated after the group angle changes", async () => {
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
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
        {
          outer: {
            points: [
              { x: 100, y: 40 },
              { x: 160, y: 40 },
              { x: 160, y: 80 },
              { x: 100, y: 80 },
            ],
          },
          holes: [],
        },
      ],
      { svgId: "rotated" },
    );

    await waitFor(() => {
      expect(ref.current!.getFabricCanvasLike().getObjects().length).toBe(1);
    });

    const before = ref.current!.getFabricCanvasLike().getObjects()[0].points;
    const beforeYs = before.map((p) => p.y);
    const beforeYSpan = Math.max(...beforeYs) - Math.min(...beforeYs);

    onSceneChange.mockClear();

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    const group = fabricCanvas.getObjects()[0];
    group.set({ angle: 90 });
    group.setCoords();
    fabricCanvas.fire("object:modified", { target: group });

    const after = ref.current!.getFabricCanvasLike().getObjects()[0].points;
    const afterXs = after.map((p) => p.x);
    const afterXSpan = Math.max(...afterXs) - Math.min(...afterXs);

    // 60×40 rect rotated 90° → width/height swap in axis-aligned bounds.
    expect(afterXSpan).toBeCloseTo(beforeYSpan, 0);
    expect(onSceneChange).toHaveBeenCalled();
  });

  it("moves multi-ring SVG polygons together when the group is dragged", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(<DrawingCanvas ref={ref} baseShape="round" />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
        {
          outer: {
            points: [
              { x: 10, y: 10 },
              { x: 50, y: 10 },
              { x: 50, y: 50 },
              { x: 10, y: 50 },
            ],
          },
          holes: [
            {
              points: [
                { x: 20, y: 20 },
                { x: 40, y: 20 },
                { x: 40, y: 40 },
                { x: 20, y: 40 },
              ],
            },
          ],
        },
      ],
      { svgId: "donut" },
    );

    await waitFor(() => {
      expect(ref.current!.getFabricCanvasLike().getObjects().length).toBe(2);
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    expect(fabricCanvas.getObjects()).toHaveLength(1);
    const group = fabricCanvas.getObjects()[0] as {
      type?: string;
      getObjects?: () => unknown[];
      left?: number;
      top?: number;
      set: (opts: { left: number; top: number }) => void;
      setCoords: () => void;
    };
    expect(group.type).toBe("group");
    expect(group.getObjects?.()).toHaveLength(2);

    const before = ref.current!.getFabricCanvasLike().getObjects();
    const beforeOuterMinX = Math.min(...before[0].points.map((p) => p.x));
    const beforeHoleMinX = Math.min(...before[1].points.map((p) => p.x));
    const holeOffset = beforeHoleMinX - beforeOuterMinX;

    group.set({ left: (group.left ?? 0) + 30, top: group.top ?? 0 });
    group.setCoords();

    const after = ref.current!.getFabricCanvasLike().getObjects();
    const afterOuterMinX = Math.min(...after[0].points.map((p) => p.x));
    const afterHoleMinX = Math.min(...after[1].points.map((p) => p.x));

    expect(afterOuterMinX).toBeCloseTo(beforeOuterMinX + 30, 0);
    expect(afterHoleMinX - afterOuterMinX).toBeCloseTo(holeOffset, 0);
  });

  it("snaps a dragged SVG group's center to the canvas mid-lines when nearby", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(<DrawingCanvas ref={ref} baseShape="round" />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
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
      ],
      { svgId: "snap-target" },
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()?.getObjects().length).toBe(1);
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    const group = fabricCanvas.getObjects()[0];

    // Drawing canvas is 400x400, so canvas center is (200, 200). Nudge the
    // group's center to within the snap tolerance of the vertical mid-line
    // only, leaving it far from the horizontal mid-line.
    group.setPositionByOrigin(new Point(204, 130), "center", "center");
    group.setCoords();
    fabricCanvas.fire("object:moving", { target: group });

    const center = group.getCenterPoint();
    expect(center.x).toBe(200);
    expect(center.y).toBe(130);
  });

  it("leaves a dragged SVG group's center untouched when far from the mid-lines", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(<DrawingCanvas ref={ref} baseShape="round" />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
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
      ],
      { svgId: "no-snap-target" },
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()?.getObjects().length).toBe(1);
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    const group = fabricCanvas.getObjects()[0];

    group.setPositionByOrigin(new Point(80, 90), "center", "center");
    group.setCoords();
    fabricCanvas.fire("object:moving", { target: group });

    const center = group.getCenterPoint();
    expect(center.x).toBe(80);
    expect(center.y).toBe(90);
  });

  it("snaps a rotating SVG group's angle to 0 degrees when nearby", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(<DrawingCanvas ref={ref} baseShape="round" />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
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
      ],
      { svgId: "rotate-snap-target" },
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()?.getObjects().length).toBe(1);
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    const group = fabricCanvas.getObjects()[0];

    group.set({ angle: 3 });
    fabricCanvas.fire("object:rotating", { target: group });

    expect(group.angle).toBe(0);
  });

  it("leaves a rotating SVG group's angle untouched when far from a cardinal orientation", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(<DrawingCanvas ref={ref} baseShape="round" />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
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
      ],
      { svgId: "rotate-no-snap-target" },
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()?.getObjects().length).toBe(1);
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    const group = fabricCanvas.getObjects()[0];

    group.set({ angle: 47 });
    fabricCanvas.fire("object:rotating", { target: group });

    expect(group.angle).toBe(47);
  });

  it("draws a guide line on the canvas overlay when a dragged SVG snaps to a mid-line, and clears it when the drag ends", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(<DrawingCanvas ref={ref} baseShape="round" />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
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
      ],
      { svgId: "guide-target" },
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()?.getObjects().length).toBe(1);
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    const group = fabricCanvas.getObjects()[0];
    const strokeSpy = vi.spyOn(fabricCanvas.contextTop, "stroke");
    const clearSpy = vi.spyOn(fabricCanvas, "clearContext");

    group.setPositionByOrigin(new Point(204, 130), "center", "center");
    group.setCoords();
    fabricCanvas.fire("object:moving", { target: group });

    expect(strokeSpy).toHaveBeenCalled();

    fabricCanvas.fire("object:modified", { target: group });

    expect(clearSpy).toHaveBeenCalledWith(fabricCanvas.contextTop);
  });

  it("draws a guide line on the canvas overlay when a rotating SVG snaps to a cardinal angle", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(<DrawingCanvas ref={ref} baseShape="round" />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
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
      ],
      { svgId: "rotate-guide-target" },
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()?.getObjects().length).toBe(1);
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    const group = fabricCanvas.getObjects()[0];
    const strokeSpy = vi.spyOn(fabricCanvas.contextTop, "stroke");

    group.set({ angle: 3 });
    fabricCanvas.fire("object:rotating", { target: group });

    expect(strokeSpy).toHaveBeenCalled();
  });

  it("selects an SVG group on pointer down and keeps drawing mode for empty canvas", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(<DrawingCanvas ref={ref} baseShape="round" />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
        {
          outer: {
            points: [
              { x: 10, y: 10 },
              { x: 80, y: 10 },
              { x: 80, y: 80 },
              { x: 10, y: 80 },
            ],
          },
          holes: [],
        },
      ],
      { svgId: "hit" },
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()?.getObjects().length).toBe(1);
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    expect(fabricCanvas.isDrawingMode).toBe(true);

    const upper = fabricCanvas.upperCanvasEl;
    const rect = upper.getBoundingClientRect();

    const pointerOnSvg = new MouseEvent("mousedown", {
      bubbles: true,
      clientX: rect.left + 40,
      clientY: rect.top + 40,
      button: 0,
    });
    Object.defineProperty(pointerOnSvg, "target", { value: upper });

    fabricCanvas._onMouseDown(pointerOnSvg as unknown as MouseEvent);

    expect(fabricCanvas.isDrawingMode).toBe(false);
    expect(fabricCanvas.getActiveObject()).toBe(fabricCanvas.getObjects()[0]);

    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();

    const pointerOnEmpty = new MouseEvent("mousedown", {
      bubbles: true,
      clientX: rect.left + 350,
      clientY: rect.top + 350,
      button: 0,
    });
    Object.defineProperty(pointerOnEmpty, "target", { value: upper });

    fabricCanvas._onMouseDown(pointerOnEmpty as unknown as MouseEvent);

    expect(fabricCanvas.isDrawingMode).toBe(true);
    expect(fabricCanvas.getActiveObject()).toBeUndefined();
  });

  it("shows the move cursor when hovering an SVG while drawing mode is on", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(<DrawingCanvas ref={ref} baseShape="round" />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
        {
          outer: {
            points: [
              { x: 10, y: 10 },
              { x: 80, y: 10 },
              { x: 80, y: 80 },
              { x: 10, y: 80 },
            ],
          },
          holes: [],
        },
      ],
      { svgId: "hover" },
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()?.getObjects().length).toBe(1);
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    expect(fabricCanvas.isDrawingMode).toBe(true);

    const upper = fabricCanvas.upperCanvasEl;
    const rect = upper.getBoundingClientRect();

    const moveOverSvg = new MouseEvent("mousemove", {
      bubbles: true,
      clientX: rect.left + 40,
      clientY: rect.top + 40,
    });
    Object.defineProperty(moveOverSvg, "target", { value: upper });
    fabricCanvas._onMouseMove(moveOverSvg as unknown as MouseEvent);

    expect(upper.style.cursor).toBe("move");

    const moveOverEmpty = new MouseEvent("mousemove", {
      bubbles: true,
      clientX: rect.left + 350,
      clientY: rect.top + 350,
    });
    Object.defineProperty(moveOverEmpty, "target", { value: upper });
    fabricCanvas._onMouseMove(moveOverEmpty as unknown as MouseEvent);

    expect(upper.style.cursor).toBe(fabricCanvas.freeDrawingCursor);
  });

  it("clears the SVG selection when the user clicks outside the canvas", async () => {
    const ref = createRef<DrawingCanvasHandle>();

    render(
      <div>
        <button type="button">Outside</button>
        <DrawingCanvas ref={ref} baseShape="round" />
      </div>,
    );

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current!.addOutlineShapes(
      [
        {
          outer: {
            points: [
              { x: 10, y: 10 },
              { x: 80, y: 10 },
              { x: 80, y: 80 },
              { x: 10, y: 80 },
            ],
          },
          holes: [],
        },
      ],
      { svgId: "blur" },
    );

    await waitFor(() => {
      expect(__drawingCanvasTestHooks.getCanvas()?.getObjects().length).toBe(1);
    });

    const fabricCanvas = __drawingCanvasTestHooks.getCanvas()!;
    const upper = fabricCanvas.upperCanvasEl;
    const rect = upper.getBoundingClientRect();
    const pointerOnSvg = new MouseEvent("mousedown", {
      bubbles: true,
      clientX: rect.left + 40,
      clientY: rect.top + 40,
      button: 0,
    });
    Object.defineProperty(pointerOnSvg, "target", { value: upper });
    fabricCanvas._onMouseDown(pointerOnSvg as unknown as MouseEvent);

    expect(fabricCanvas.getActiveObject()).toBe(fabricCanvas.getObjects()[0]);
    expect(fabricCanvas.isDrawingMode).toBe(false);

    fireEvent.pointerDown(screen.getByRole("button", { name: /outside/i }));

    expect(fabricCanvas.getActiveObject()).toBeUndefined();
    expect(fabricCanvas.isDrawingMode).toBe(true);
  });
});
