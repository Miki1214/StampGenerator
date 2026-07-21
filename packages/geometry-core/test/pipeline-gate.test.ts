import { describe, expect, it } from "vitest";
import { isPipelineGateReady } from "../src/pipeline-gate";

describe("geometry-core pipeline gate readiness", () => {
  it("reports the package as ready so CI can enforce the unit-test gate", () => {
    expect(isPipelineGateReady()).toBe(true);
  });
});
