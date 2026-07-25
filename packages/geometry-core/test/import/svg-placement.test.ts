import { describe, expect, it } from "vitest";
import {
  placePathsInFrame,
  rawPathBounds,
} from "../../src/import/svg-placement";

describe("placePathsInFrame", () => {
  it("centers and scales a rect to the requested fraction of the frame", () => {
    const raw = {
      rings: [
        {
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 50 },
            { x: 0, y: 50 },
          ],
        },
      ],
    };

    const placed = placePathsInFrame(raw, {
      frameUnits: 400,
      sizeFraction: 0.5,
      offsetXFraction: 0,
      offsetYFraction: 0,
    });

    const bounds = rawPathBounds(placed);
    expect(bounds).not.toBeNull();
    // Max extent was 100 → 200 (50% of 400); aspect kept → 200×100.
    expect(bounds!.maxX - bounds!.minX).toBeCloseTo(200);
    expect(bounds!.maxY - bounds!.minY).toBeCloseTo(100);
    expect((bounds!.minX + bounds!.maxX) / 2).toBeCloseTo(200);
    expect((bounds!.minY + bounds!.maxY) / 2).toBeCloseTo(200);
  });

  it("applies offset fractions relative to the frame center", () => {
    const raw = {
      rings: [
        {
          points: [
            { x: 10, y: 10 },
            { x: 30, y: 10 },
            { x: 30, y: 30 },
            { x: 10, y: 30 },
          ],
        },
      ],
    };

    const placed = placePathsInFrame(raw, {
      frameUnits: 400,
      sizeFraction: 0.25,
      offsetXFraction: 0.1,
      offsetYFraction: -0.2,
    });

    const bounds = rawPathBounds(placed);
    expect(bounds).not.toBeNull();
    expect((bounds!.minX + bounds!.maxX) / 2).toBeCloseTo(200 + 40);
    expect((bounds!.minY + bounds!.maxY) / 2).toBeCloseTo(200 - 80);
  });

  it("returns empty input unchanged", () => {
    const empty = { rings: [] };
    expect(
      placePathsInFrame(empty, {
        frameUnits: 400,
        sizeFraction: 0.5,
        offsetXFraction: 0,
        offsetYFraction: 0,
      }),
    ).toEqual(empty);
  });
});
