import { describe, expect, it } from "vitest";
import type { PathShapeSet } from "@stamp-generator/geometry-core";
import {
  isFilledOutlineObject,
  outlineShapesToPolygons,
  STAMP_FILLED_OUTLINE_ROLE,
  STAMP_INK_COLOR,
} from "../../src/lib/outline-to-fabric";

describe("outlineShapesToPolygons", () => {
  it("builds ink polygons for outers and white punch-outs for holes", () => {
    const shapes: PathShapeSet = [
      {
        outer: {
          points: [
            { x: 0, y: 0 },
            { x: 40, y: 0 },
            { x: 40, y: 40 },
            { x: 0, y: 40 },
          ],
        },
        holes: [
          {
            points: [
              { x: 10, y: 10 },
              { x: 30, y: 10 },
              { x: 30, y: 30 },
              { x: 10, y: 30 },
            ],
          },
        ],
      },
    ];

    const polygons = outlineShapesToPolygons(shapes);
    expect(polygons).toHaveLength(2);
    expect(polygons[0].fill).toBe(STAMP_INK_COLOR);
    expect(polygons[1].fill).toBe("#ffffff");
    expect(isFilledOutlineObject(polygons[0])).toBe(true);
    expect(
      (polygons[0] as { stampRole?: string }).stampRole,
    ).toBe(STAMP_FILLED_OUTLINE_ROLE);
  });
});
