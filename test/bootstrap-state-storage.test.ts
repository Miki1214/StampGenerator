import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bootstrapDir = path.join(repoRoot, "infra", "bootstrap");

describe("terraform state storage bootstrap", () => {
  it("provides a documented az CLI script that creates remote-state storage", () => {
    const script = readFileSync(
      path.join(bootstrapDir, "create-state-storage.sh"),
      "utf8",
    );
    const readme = readFileSync(path.join(bootstrapDir, "README.md"), "utf8");

    expect(script).toMatch(/az group create/);
    expect(script).toMatch(/az storage account create/);
    expect(script).toMatch(/az storage container create/);
    expect(readme).toMatch(/create-state-storage/);
    expect(readme).toMatch(/manual/i);
  });
});
