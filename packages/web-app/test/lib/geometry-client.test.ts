import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import {
  initManifold,
  setStampHardwareDataProvider,
  STAMP_HARDWARE_FILES,
  type StampHardwarePart,
} from "@stamp-generator/geometry-core";
import { createInProcessGeometryClient } from "../../src/lib/geometry-client";

const stlsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../stls",
);

describe("createInProcessGeometryClient", () => {
  beforeAll(async () => {
    await initManifold();
    setStampHardwareDataProvider((part: StampHardwarePart) => {
      const bytes = readFileSync(join(stlsDir, STAMP_HARDWARE_FILES[part]));
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
    });
  });

  it("processSvg returns cleaned shapes for a valid rectangle SVG", async () => {
    const client = createInProcessGeometryClient();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="30" height="40" />
    </svg>`;

    const result = await client.processSvg(svg);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.shapes.length).toBeGreaterThan(0);
  });
});
