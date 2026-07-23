import { describe, expect, it } from "vitest";
import type { PathShapeSet } from "../../src/validate/types";
import { mirrorShapes } from "../../src/geometry/mirror";

describe("mirrorShapes", () => {
  it("flips X coordinates of an asymmetric L-shape around the shape-set bounding-box center", () => {
    // L-shape: wide base (0–10) with a tall stem only on the left (x=0–2).
    // Bounding box is [0,10]×[0,5], so center X is 5.
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 2 },
            { x: 2, y: 2 },
            { x: 2, y: 5 },
            { x: 0, y: 5 },
          ],
        },
        holes: [],
      },
    ];

    const mirrored = mirrorShapes(shapes);

    const expectedPoints = [
      { x: 10, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 8, y: 2 },
      { x: 8, y: 5 },
      { x: 10, y: 5 },
    ];

    expect(mirrored).toHaveLength(1);
    expect(mirrored[0].holes).toHaveLength(0);
    expect(mirrored[0].outer.points).toEqual(expectedPoints);
  });

  it("mirrors around an explicit centerX (design frame), not the tight bbox", () => {
    // Small square on the left of a 100-wide frame. Tight bbox center is 15;
    // frame center is 50. Mirroring about the frame must land it on the right.
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 10, y: 40 },
            { x: 20, y: 40 },
            { x: 20, y: 60 },
            { x: 10, y: 60 },
          ],
        },
        holes: [],
      },
    ];

    const mirrored = mirrorShapes(shapes, 50);
    const xs = mirrored[0].outer.points.map((p) => p.x);

    expect(Math.min(...xs)).toBeCloseTo(80, 5);
    expect(Math.max(...xs)).toBeCloseTo(90, 5);
  });
});
