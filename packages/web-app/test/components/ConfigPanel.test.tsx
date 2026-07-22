import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfigPanel } from "../../src/components/ConfigPanel";

describe("ConfigPanel", () => {
  it("rejects a negative designHeightMm with an inline error and does not propagate the invalid value", () => {
    const onChange = vi.fn();

    render(
      <ConfigPanel
        value={{
          designHeightMm: 2,
          canvasSizeUnits: 100,
          canvasSizeMm: 50,
          baseShape: "square",
        }}
        onChange={onChange}
      />,
    );

    const designHeightInput = screen.getByLabelText(/design height/i);
    fireEvent.change(designHeightInput, { target: { value: "-1" } });

    expect(screen.getByRole("alert").textContent).toMatch(/design height/i);
    expect(onChange).not.toHaveBeenCalled();
  });
});
