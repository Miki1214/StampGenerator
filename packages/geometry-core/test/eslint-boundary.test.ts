import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(packageRoot, "../..");

describe("geometry-core DOM import boundary", () => {
  it("fails the lint gate when geometry-core imports a DOM-dependent package", async () => {
    const eslint = new ESLint({
      cwd: repoRoot,
    });

    const [result] = await eslint.lintText(`import "react";\n`, {
      filePath: path.join(
        repoRoot,
        "packages",
        "geometry-core",
        "src",
        "forbidden-dom-import.ts",
      ),
    });

    expect(result.errorCount).toBeGreaterThan(0);
    expect(
      result.messages.some((message) =>
        /DOM|react|restricted/i.test(message.message),
      ),
    ).toBe(true);
  });
});
