import { describe, expect, it } from "vitest";
import {
  snapAngleToCardinal,
  snapCenterToCanvasMiddle,
} from "../../src/lib/snap-guides";

describe("snapCenterToCanvasMiddle", () => {
  it("snaps the x coordinate to the canvas center when within tolerance", () => {
    const result = snapCenterToCanvasMiddle(
      { x: 204, y: 50 },
      { x: 200, y: 200 },
      8,
    );

    expect(result.x).toBe(200);
    expect(result.snappedX).toBe(true);
  });

  it("snaps the y coordinate to the canvas center when within tolerance", () => {
    const result = snapCenterToCanvasMiddle(
      { x: 50, y: 195 },
      { x: 200, y: 200 },
      8,
    );

    expect(result.y).toBe(200);
    expect(result.snappedY).toBe(true);
  });

  it("leaves coordinates untouched when outside tolerance of either mid-line", () => {
    const point = { x: 50, y: 60 };
    const result = snapCenterToCanvasMiddle(point, { x: 200, y: 200 }, 8);

    expect(result).toEqual({ x: 50, y: 60, snappedX: false, snappedY: false });
  });

  it("snaps both axes to the exact crossing point when near canvas center", () => {
    const result = snapCenterToCanvasMiddle(
      { x: 203, y: 197 },
      { x: 200, y: 200 },
      8,
    );

    expect(result).toEqual({ x: 200, y: 200, snappedX: true, snappedY: true });
  });
});

describe("snapAngleToCardinal", () => {
  it("snaps an angle near 0 degrees to exactly 0", () => {
    const result = snapAngleToCardinal(3, 5);

    expect(result).toEqual({ angle: 0, snapped: true });
  });

  it("snaps an angle near 360 degrees to 0 (wraparound)", () => {
    const result = snapAngleToCardinal(358, 5);

    expect(result).toEqual({ angle: 0, snapped: true });
  });

  it("snaps angles near 90, 180, and 270 to their cardinal value", () => {
    expect(snapAngleToCardinal(93, 5)).toEqual({ angle: 90, snapped: true });
    expect(snapAngleToCardinal(177, 5)).toEqual({ angle: 180, snapped: true });
    expect(snapAngleToCardinal(268, 5)).toEqual({ angle: 270, snapped: true });
  });

  it("leaves an angle far from any cardinal orientation untouched", () => {
    const result = snapAngleToCardinal(47, 5);

    expect(result).toEqual({ angle: 47, snapped: false });
  });
});
