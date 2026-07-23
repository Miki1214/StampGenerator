import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TextInputPanel } from "../../src/components/TextInputPanel";

describe("TextInputPanel", () => {
  it("calls its import callback with the correct TextImportRequest on submit", () => {
    const onImport = vi.fn();

    render(
      <TextInputPanel
        onImport={onImport}
        baseShape="round"
        frameUnits={400}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^text$/i), {
      target: { value: "HELLO" },
    });
    fireEvent.change(screen.getByLabelText(/font/i), {
      target: { value: "serif" },
    });
    fireEvent.change(screen.getByLabelText(/size/i), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add text/i }));

    expect(onImport).toHaveBeenCalledWith({
      text: "HELLO",
      fontId: "serif",
      fontSizeMm: 12,
      verticalAlign: "border",
      lineAlign: "center",
      frameUnits: 400,
      baseShape: "round",
    });
  });

  it("defaults to 30 mm size and around-the-border alignment on round stamps", () => {
    const onImport = vi.fn();

    render(
      <TextInputPanel
        onImport={onImport}
        baseShape="round"
        frameUnits={400}
      />,
    );

    expect(screen.getByLabelText(/size/i)).toHaveProperty("value", "30");
    expect(screen.getByLabelText(/vertical alignment/i)).toHaveProperty(
      "value",
      "border",
    );

    fireEvent.change(screen.getByLabelText(/^text$/i), {
      target: { value: "Hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add text/i }));

    expect(onImport).toHaveBeenCalledWith(
      expect.objectContaining({
        fontSizeMm: 30,
        verticalAlign: "border",
      }),
    );
  });

  it("hides the Around the border option when the base shape is square", () => {
    render(
      <TextInputPanel
        onImport={() => {}}
        baseShape="square"
        frameUnits={400}
      />,
    );

    const options = screen
      .getByLabelText(/vertical alignment/i)
      .querySelectorAll("option");
    const labels = [...options].map((option) => option.textContent);
    expect(labels).not.toContain("Around the border");
    expect(labels).toContain("Center");
    expect(labels).toContain("Top-down");
  });

  it("offers Around the border when the base shape is round", () => {
    render(
      <TextInputPanel
        onImport={() => {}}
        baseShape="round"
        frameUnits={400}
      />,
    );

    const options = screen
      .getByLabelText(/vertical alignment/i)
      .querySelectorAll("option");
    const labels = [...options].map((option) => option.textContent);
    expect(labels).toContain("Around the border");
  });

  it("includes chosen alignment fields in the import payload", () => {
    const onImport = vi.fn();

    render(
      <TextInputPanel
        onImport={onImport}
        baseShape="round"
        frameUnits={400}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^text$/i), {
      target: { value: "A\nB" },
    });
    fireEvent.change(screen.getByLabelText(/vertical alignment/i), {
      target: { value: "top" },
    });
    fireEvent.change(screen.getByLabelText(/line alignment/i), {
      target: { value: "left" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add text/i }));

    expect(onImport).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "A\nB",
        verticalAlign: "top",
        lineAlign: "left",
        baseShape: "round",
        frameUnits: 400,
      }),
    );
  });
});
