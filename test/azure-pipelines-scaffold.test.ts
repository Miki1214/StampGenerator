import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("azure pipelines foundation", () => {
  it("defines lint, unit test, build, terraform, and SWA deploy stages", () => {
    const pipeline = readFileSync(
      path.join(repoRoot, "azure-pipelines.yml"),
      "utf8",
    );

    expect(pipeline).toMatch(/-\s*stage:\s*Lint/);
    expect(pipeline).toMatch(/-\s*stage:\s*UnitTest/);
    expect(pipeline).toMatch(/-\s*stage:\s*Build/);
    expect(pipeline).toMatch(/-\s*stage:\s*TerraformPlan/);
    expect(pipeline).toMatch(/-\s*stage:\s*TerraformApply/);
    expect(pipeline).toMatch(/-\s*stage:\s*DeploySwa/);
    expect(pipeline).toMatch(/AzureStaticWebApp@0/);
  });
});
