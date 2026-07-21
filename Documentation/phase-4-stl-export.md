[< Back to index](index.md)

# Phase 4 - STL Export

## Goal

Serialize the final `Mesh` (from [Phase 3](phase-3-stamp-geometry.md)) into a
binary STL byte buffer, independent of any browser API, so it stays testable
in plain Node.

## Contracts

```ts
export interface MeshExporter {
  export(mesh: Mesh): Uint8Array
}

export class BinaryStlExporter implements MeshExporter {}
```

Download triggering (`Blob` + `URL.createObjectURL` + synthetic anchor click)
is a **`web-app`** concern, not `geometry-core` - this keeps the export
module pure and DOM-free, consistent with the project-wide "no DOM in
`geometry-core`" rule in [index.md](index.md).

```ts
// packages/web-app/src/lib/trigger-download.ts
export function triggerDownload(bytes: Uint8Array, filename: string): void
```

## File layout

```
packages/geometry-core/src/export/
  binary-stl-exporter.ts
packages/geometry-core/test/export/
  binary-stl-exporter.test.ts
  stl-test-reader.ts        # test-only STL parser used to verify round-trips
packages/web-app/src/lib/
  trigger-download.ts
packages/web-app/test/lib/
  trigger-download.test.ts
```

## TDD checklist

- [ ] `BinaryStlExporter.export()` on a single-triangle mesh produces the
      correct 80-byte header, followed by a 4-byte little-endian triangle
      count of `1`, followed by exactly one 50-byte triangle record.
- [ ] `BinaryStlExporter.export()` on a multi-triangle mesh produces a byte
      length exactly matching `84 + 50 * triangleCount`.
- [ ] Exported bytes, parsed back by the test-only `stl-test-reader.ts`,
      yield the same triangle count as the input mesh.
- [ ] Exported bytes, parsed back, yield triangle normals matching the input
      mesh's computed face normals within a small tolerance.
- [ ] `triggerDownload` creates an object URL and clicks a synthetic anchor
      element with the expected `download` filename attribute (DOM/component
      test).
- [ ] `triggerDownload` revokes the object URL after triggering the click (no
      leaked blob URLs).

## Acceptance criteria

Round-tripping any [Phase 3](phase-3-stamp-geometry.md) output `Mesh` through
`export()` and the verification parser reproduces the same geometry: equal
vertex count, equal triangle count, and equal bounding box (within floating
point tolerance).

## Risks / edge cases

- Very large meshes (megabyte-plus STL output) - confirm the `Blob`-based
  download flow does not freeze the UI thread. If it does, moving the export
  step into a Web Worker is the fix - noted here as a stretch item, not
  required for MVP-sized stamp designs.
- Byte-order/endianness bugs in the binary writer - covered directly by the
  round-trip tests above, which is why a dedicated test-only reader is worth
  building rather than only asserting raw byte lengths.

## Dependencies

- **Depends on**: [Phase 3](phase-3-stamp-geometry.md).
- **Blocks**: [Phase 5](phase-5-web-app-ui.md) (the `DownloadButton` wiring).
