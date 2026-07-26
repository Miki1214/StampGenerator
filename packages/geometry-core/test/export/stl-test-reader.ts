/** Test-only binary STL parser for round-trip assertions. */

export interface StlTriangle {
  normal: [number, number, number];
  vertices: [[number, number, number], [number, number, number], [number, number, number]];
}

export interface ParsedStl {
  triangleCount: number;
  triangles: StlTriangle[];
}

export function parseBinaryStl(bytes: Uint8Array): ParsedStl {
  if (bytes.byteLength < 84) {
    throw new Error(`STL too short for header: ${bytes.byteLength} bytes`);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangleCount = view.getUint32(80, true);
  const expectedLength = 84 + 50 * triangleCount;
  if (bytes.byteLength !== expectedLength) {
    throw new Error(
      `STL length ${bytes.byteLength} does not match triangle count ${triangleCount} (expected ${expectedLength})`,
    );
  }

  const triangles: StlTriangle[] = [];
  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + i * 50;
    const normal: [number, number, number] = [
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true),
    ];
    const vertices: StlTriangle["vertices"] = [
      [
        view.getFloat32(offset + 12, true),
        view.getFloat32(offset + 16, true),
        view.getFloat32(offset + 20, true),
      ],
      [
        view.getFloat32(offset + 24, true),
        view.getFloat32(offset + 28, true),
        view.getFloat32(offset + 32, true),
      ],
      [
        view.getFloat32(offset + 36, true),
        view.getFloat32(offset + 40, true),
        view.getFloat32(offset + 44, true),
      ],
    ];
    triangles.push({ normal, vertices });
  }

  return { triangleCount, triangles };
}
