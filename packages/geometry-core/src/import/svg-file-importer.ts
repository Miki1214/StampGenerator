import type { Point2D, RawPathSet, ShapeImporter } from "./types";

/** 2D affine transform: [a c e; b d f; 0 0 1] */
interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

const IDENTITY: Matrix2D = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export class SvgFileImporter implements ShapeImporter<string> {
  import(source: string, _tolerance: number): RawPathSet {
    const rings: RawPathSet["rings"] = [];
    walkElements(source, IDENTITY, (tag, attrs, transform) => {
      if (tag === "rect") {
        rings.push({ points: rectPoints(attrs, transform) });
      }
    });
    return { rings };
  }
}

type ElementVisitor = (
  tag: string,
  attrs: Record<string, string>,
  transform: Matrix2D,
) => void;

function walkElements(
  source: string,
  rootTransform: Matrix2D,
  visit: ElementVisitor,
): void {
  const tokenPattern =
    /<\/?([a-zA-Z_][\w:.-]*)([^>]*?)(\/?)\s*>/g;
  const stack: Matrix2D[] = [rootTransform];
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(source)) !== null) {
    const full = match[0];
    const tag = match[1].toLowerCase();
    const attrText = match[2];
    const selfClosing = match[3] === "/" || full.endsWith("/>");
    const isClose = full.startsWith("</");

    if (isClose) {
      if (stack.length > 1) {
        stack.pop();
      }
      continue;
    }

    const attrs = parseAttributes(attrText);
    const local = parseTransform(attrs.transform);
    const parent = stack[stack.length - 1];
    const combined = multiply(parent, local);

    visit(tag, attrs, combined);

    if (!selfClosing && isContainerTag(tag)) {
      stack.push(combined);
    }
  }
}

function isContainerTag(tag: string): boolean {
  return tag === "g" || tag === "svg" || tag === "symbol";
}

function rectPoints(
  attrs: Record<string, string>,
  transform: Matrix2D,
): Point2D[] {
  const x = Number(attrs.x ?? 0);
  const y = Number(attrs.y ?? 0);
  const width = Number(attrs.width ?? 0);
  const height = Number(attrs.height ?? 0);

  return [
    apply(transform, { x, y }),
    apply(transform, { x: x + width, y }),
    apply(transform, { x: x + width, y: y + height }),
    apply(transform, { x, y: y + height }),
  ];
}

function parseAttributes(attributeText: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern =
    /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(attributeText)) !== null) {
    attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function parseTransform(value: string | undefined): Matrix2D {
  if (!value || !value.trim()) {
    return IDENTITY;
  }

  let result = IDENTITY;
  const callPattern = /(matrix|translate|scale|rotate)\s*\(([^)]*)\)/gi;
  let match: RegExpExecArray | null;

  while ((match = callPattern.exec(value)) !== null) {
    const kind = match[1].toLowerCase();
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);

    let next = IDENTITY;
    if (kind === "translate") {
      next = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: args[0] ?? 0,
        f: args[1] ?? 0,
      };
    } else if (kind === "matrix" && args.length >= 6) {
      next = {
        a: args[0],
        b: args[1],
        c: args[2],
        d: args[3],
        e: args[4],
        f: args[5],
      };
    } else if (kind === "scale") {
      const sx = args[0] ?? 1;
      const sy = args[1] ?? sx;
      next = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
    }

    result = multiply(result, next);
  }

  return result;
}

function multiply(m1: Matrix2D, m2: Matrix2D): Matrix2D {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function apply(m: Matrix2D, p: Point2D): Point2D {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}
