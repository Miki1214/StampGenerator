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

  it("resolves a nested g translate into absolute coordinates", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(5, 10)">
        <rect x="1" y="2" width="3" height="4" />
      </g>
    </svg>`;

    const importer = new SvgFileImporter();
    const result = importer.import(svg, 0.1);

    expect(result.rings).toHaveLength(1);
    expect(result.rings[0].points).toEqual([
      { x: 6, y: 12 },
      { x: 9, y: 12 },
      { x: 9, y: 16 },
      { x: 6, y: 16 },
    ]);
  });

  it("resolves a matrix transform on a path into absolute coordinates", () => {
    // matrix(2,0,0,2,5,5) scales by 2 then translates by (5,5)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <path transform="matrix(2 0 0 2 5 5)" d="M 0 0 L 10 0 L 10 10 Z" />
    </svg>`;

    const importer = new SvgFileImporter();
    const result = importer.import(svg, 0.1);

    expect(result.rings).toHaveLength(1);
    expect(result.rings[0].points).toEqual([
      { x: 5, y: 5 },
      { x: 25, y: 5 },
      { x: 25, y: 25 },
    ]);
  });
});
