import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CollapsibleTextPanel } from "../../src/components/CollapsibleTextPanel";

describe("CollapsibleTextPanel", () => {
  it("is collapsed by default and expands to reveal the text form", () => {
    render(
      <CollapsibleTextPanel
        onImport={() => {}}
        baseShape="round"
        frameUnits={400}
      />,
    );

    expect(screen.queryByLabelText(/^text$/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /add text/i })).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: /add typography to the stamp/i }),
    );

    expect(screen.getByLabelText(/^text$/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /add text/i })).toBeTruthy();
  });

  it("forwards import submissions from the nested panel", () => {
    const onImport = vi.fn();

    render(
      <CollapsibleTextPanel
        onImport={onImport}
        baseShape="round"
        frameUnits={400}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /add typography to the stamp/i }),
    );
    fireEvent.change(screen.getByLabelText(/^text$/i), {
      target: { value: "Hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add text/i }));

    expect(onImport).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Hi",
        frameUnits: 400,
        baseShape: "round",
      }),
    );
  });
});
