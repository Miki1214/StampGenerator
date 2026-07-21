import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TextInputPanel } from "../../src/components/TextInputPanel";

describe("TextInputPanel", () => {
  it("calls its import callback with the correct TextImportRequest on submit", () => {
    const onImport = vi.fn();

    render(<TextInputPanel onImport={onImport} />);

    fireEvent.change(screen.getByLabelText(/text/i), {
      target: { value: "HELLO" },
    });
    fireEvent.change(screen.getByLabelText(/font/i), {
      target: { value: "serif" },
    });
    fireEvent.change(screen.getByLabelText(/size/i), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /import text/i }));

    expect(onImport).toHaveBeenCalledWith({
      text: "HELLO",
      fontId: "serif",
      fontSizeMm: 12,
    });
  });
});
