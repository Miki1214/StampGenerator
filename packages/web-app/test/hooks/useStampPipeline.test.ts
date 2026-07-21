import { beforeAll, describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { initManifold } from "@stamp-generator/geometry-core";
import { useStampPipeline } from "../../src/hooks/useStampPipeline";

describe("useStampPipeline", () => {
  beforeAll(async () => {
    await initManifold();
  });

  it("transitions idle -> importing -> validating -> ready on a successful import of a clean SVG", async () => {
    const statuses: string[] = [];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="30" height="40" />
    </svg>`;
    const file = new File([svg], "clean.svg", { type: "image/svg+xml" });

    const { result } = renderHook(() => {
      const pipeline = useStampPipeline();
      statuses.push(pipeline.state.status);
      return pipeline;
    });

    expect(result.current.state.status).toBe("idle");

    await act(async () => {
      result.current.importFromSvg(file);
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("ready");
    });

    expect(statuses).toContain("importing");
    expect(statuses).toContain("validating");
    expect(statuses[statuses.length - 1]).toBe("ready");
    const idleIdx = statuses.indexOf("idle");
    const importingIdx = statuses.indexOf("importing");
    const validatingIdx = statuses.indexOf("validating");
    const readyIdx = statuses.lastIndexOf("ready");
    expect(idleIdx).toBeLessThan(importingIdx);
    expect(importingIdx).toBeLessThan(validatingIdx);
    expect(validatingIdx).toBeLessThan(readyIdx);
  });
});
