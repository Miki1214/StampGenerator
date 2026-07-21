import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readTerraform(relativePath: string): string {
  return readFileSync(path.join(repoRoot, "infra", "terraform", relativePath), "utf8");
}

describe("terraform foundation scaffold", () => {
  it("declares a resource group and Static Web App keyed by environment", () => {
    const main = readTerraform("main.tf");
    const variables = readTerraform("variables.tf");
    const backend = readTerraform("backend.tf");

    expect(main).toMatch(/resource\s+"azurerm_resource_group"/);
    expect(main).toMatch(/resource\s+"azurerm_static_web_app"/);
    expect(variables).toMatch(/variable\s+"environment"/);
    expect(variables).toMatch(/dev/);
    expect(variables).toMatch(/prod/);
    expect(backend).toMatch(/backend\s+"azurerm"/);
  });
});
