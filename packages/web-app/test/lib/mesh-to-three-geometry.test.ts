import type { Mesh } from "@stamp-generator/geometry-core";
import { describe, expect, it } from "vitest";
import { meshToThreeGeometry } from "../../src/lib/mesh-to-three-geometry";

describe("meshToThreeGeometry", () => {
  it("maps geometry-core Mesh vertices and indices into BufferGeometry", () => {
    const mesh: Mesh = {
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      triangleIndices: new Uint32Array([0, 1, 2]),
    };

    const geometry = meshToThreeGeometry(mesh);
    const position = geometry.getAttribute("position");
    const index = geometry.getIndex();

    expect(position).toBeTruthy();
    expect(position!.count).toBe(3);
    expect(position!.array).toEqual(mesh.vertices);
    expect(index).toBeTruthy();
    expect(Array.from(index!.array)).toEqual([0, 1, 2]);
    expect(geometry.getAttribute("normal")).toBeTruthy();

    geometry.dispose();
  });
});
