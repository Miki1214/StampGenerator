import { describe, expect, it } from "vitest";
import { FabricCanvasImporter } from "../../src/import/fabric-canvas-importer";
import type { FabricCanvasLike } from "../../src/import/fabric-canvas-importer";

describe("FabricCanvasImporter", () => {
  it("imports a single freehand stroke as one ring of points", () => {
    const canvas: FabricCanvasLike = {
      getObjects: () => [
        {
          type: "path",
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 5 },
            { x: 20, y: 0 },
          ],
        },
      ],
    };

    const importer = new FabricCanvasImporter();
    const result = importer.import(canvas, 0.1);

    expect(result.rings).toHaveLength(1);
    expect(result.rings[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ]);
  });
});
