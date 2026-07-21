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

  it("renders nothing when given an ok validation result", () => {
    const { container } = render(
      <ValidationMessages result={{ ok: true }} />,
    );

    expect(container.innerHTML).toBe("");
  });
});
