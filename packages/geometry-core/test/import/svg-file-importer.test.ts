import { describe, expect, it } from "vitest";
import { SvgFileImporter } from "../../src/import/svg-file-importer";

describe("SvgFileImporter", () => {
  it("imports a single rect as a 4-point ring", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="30" height="40" />
    </svg>`;

    const importer = new SvgFileImporter();
    const result = importer.import(svg, 0.1);

    expect(result.rings).toHaveLength(1);
    expect(result.rings[0].points).toEqual([
      { x: 10, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 60 },
      { x: 10, y: 60 },
    ]);
  });
});
