import { Polygon, type FabricObject } from "fabric";
import type { PathShapeSet, Point2D, Ring } from "@stamp-generator/geometry-core";

/** Matches the freehand brush so text and strokes read as one design. */
export const STAMP_INK_COLOR = "#0a192f";

/** Marker so canvas export skips stroke-ribbon expansion for these shapes. */
export const STAMP_FILLED_OUTLINE_ROLE = "filled-outline";

export type StampFabricObject = FabricObject & {
  stampRole?: string;
  /** Groups polygons from one SVG import so they can be removed/repositioned. */
  stampSvgId?: string;
};

/** Build Fabric polygons for cleaned text/SVG-like shapes (outers + hole punch-outs). */
export function outlineShapesToPolygons(shapes: PathShapeSet): Polygon[] {
  const polygons: Polygon[] = [];
  for (const shape of shapes) {
    polygons.push(ringToPolygon(shape.outer, STAMP_INK_COLOR));
    for (const hole of shape.holes) {
      // White fill punches glyph counters through the navy ink on the white canvas;
      // ShapeCleaner still nests these rings as holes on import.
      polygons.push(ringToPolygon(hole, "#ffffff"));
    }
  }
  return polygons;
}

function ringToPolygon(ring: Ring, fill: string): Polygon {
  const points = closedRingPoints(ring.points);
  const polygon = new Polygon(points, {
    fill,
    stroke: undefined,
    strokeWidth: 0,
    objectCaching: true,
    selectable: false,
    evented: false,
  });
  (polygon as StampFabricObject).stampRole = STAMP_FILLED_OUTLINE_ROLE;
  return polygon;
}

function closedRingPoints(points: Point2D[]): { x: number; y: number }[] {
  if (points.length === 0) {
    return [];
  }
  const out = points.map((p) => ({ x: p.x, y: p.y }));
  const first = out[0];
  const last = out[out.length - 1];
  if (first.x !== last.x || first.y !== last.y) {
    out.push({ x: first.x, y: first.y });
  }
  return out;
}

export function isFilledOutlineObject(obj: FabricObject): boolean {
  const stamped = obj as StampFabricObject;
  if (stamped.stampRole === STAMP_FILLED_OUTLINE_ROLE) {
    return true;
  }
  const fill = (obj as FabricObject & { fill?: unknown }).fill;
  const strokeWidth = (obj as FabricObject & { strokeWidth?: number }).strokeWidth;
  return (
    fill != null &&
    fill !== "" &&
    fill !== "transparent" &&
    !(typeof strokeWidth === "number" && strokeWidth > 0)
  );
}
