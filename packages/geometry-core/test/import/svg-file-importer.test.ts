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

  it("flattens a path containing cubic beziers within the given tolerance", () => {
    // Cubic from (0,0) to (1,0) with control points (0,1) and (1,1)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <path d="M 0 0 C 0 1 1 1 1 0" />
    </svg>`;
    const tolerance = 0.05;

    const importer = new SvgFileImporter();
    const result = importer.import(svg, tolerance);

    expect(result.rings).toHaveLength(1);
    const points = result.rings[0].points;
    expect(points.length).toBeGreaterThan(2);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 1, y: 0 });

    // Every segment chord's control-point deviation is covered by reusing
    // flattenCubicBezier; verify sample points stay near the true curve
    // by checking y is within [0, 1] and endpoints match.
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(-tolerance);
      expect(point.x).toBeLessThanOrEqual(1 + tolerance);
      expect(point.y).toBeGreaterThanOrEqual(-tolerance);
      expect(point.y).toBeLessThanOrEqual(1 + tolerance);
    }

    // Tighter tolerance must produce a denser polyline than a coarse one
    const coarse = importer.import(svg, 0.5).rings[0].points;
    expect(points.length).toBeGreaterThan(coarse.length);
  });

  it("throws a descriptive error for malformed SVG input instead of returning empty rings", () => {
    const importer = new SvgFileImporter();

    expect(() => importer.import("not svg at all", 0.1)).toThrow(
      /malformed|invalid|svg/i,
    );
  });

  it("imports a stroke-only ellipse as outer and inner rings for the annular stroke", () => {
    // Mirrors compass.svg: yellow ring is an <ellipse fill="none" stroke=…>.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="50" rx="30" ry="20" fill="none" stroke="#ff0" stroke-width="10" />
    </svg>`;

    const importer = new SvgFileImporter();
    const result = importer.import(svg, 0.5);

    expect(result.rings.length).toBe(2);
    const radii = result.rings.map((ring) => {
      const xs = ring.points.map((p) => p.x);
      const ys = ring.points.map((p) => p.y);
      return {
        rx: (Math.max(...xs) - Math.min(...xs)) / 2,
        ry: (Math.max(...ys) - Math.min(...ys)) / 2,
      };
    });
    radii.sort((a, b) => b.rx - a.rx);
    // Outer ≈ rx+sw/2, inner ≈ rx-sw/2
    expect(radii[0].rx).toBeCloseTo(35, 0);
    expect(radii[0].ry).toBeCloseTo(25, 0);
    expect(radii[1].rx).toBeCloseTo(25, 0);
    expect(radii[1].ry).toBeCloseTo(15, 0);
  });
});
