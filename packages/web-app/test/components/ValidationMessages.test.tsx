import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ValidationMessages } from "../../src/components/ValidationMessages";

describe("ValidationMessages", () => {
  it("renders exactly one message element per issue using each issue's message text", () => {
    render(
      <ValidationMessages
        result={{
          ok: false,
          issues: [
            { code: "EMPTY_DESIGN", message: "Design is empty" },
            { code: "FEATURE_TOO_NARROW", message: "Feature too narrow" },
          ],
        }}
      />,
    );

    const messages = screen.getAllByRole("listitem");
    expect(messages).toHaveLength(2);
    expect(messages[0].textContent).toBe("Design is empty");
    expect(messages[1].textContent).toBe("Feature too narrow");
  });

  it("renders warnings when the result is ok but has warnings", () => {
    render(
      <ValidationMessages
        result={{
          ok: true,
          warnings: [
            {
              code: "FEATURE_TOO_NARROW",
              severity: "warning",
              message:
                "A feature is narrower than the minimum size of 0.3mm — it might not be represented correctly",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Warnings")).toBeTruthy();
    const messages = screen.getAllByRole("listitem");
    expect(messages).toHaveLength(1);
    expect(messages[0].textContent).toMatch(/might not be represented/i);
  });

  it("renders nothing when given an ok validation result with no warnings", () => {
    const { container } = render(
      <ValidationMessages result={{ ok: true }} />,
    );

    expect(container.innerHTML).toBe("");
  });
});
