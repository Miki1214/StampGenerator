import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SvgDropZone } from "../../src/components/SvgDropZone";

describe("SvgDropZone", () => {
  it("calls its import callback with the dropped file's text and name", async () => {
    const onImport = vi.fn();
    const svgText =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';

    render(<SvgDropZone onImport={onImport} />);

    const dropZone = screen.getByRole("region", { name: /svg drop/i });
    const file = new File([svgText], "stamp.svg", { type: "image/svg+xml" });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await vi.waitFor(() => {
      expect(onImport).toHaveBeenCalledWith({
        svgText,
        fileName: "stamp.svg",
      });
    });
  });

  it("rejects non-.svg file drops with a visible message without calling the import callback", async () => {
    const onImport = vi.fn();

    render(<SvgDropZone onImport={onImport} />);

    const dropZone = screen.getByRole("region", { name: /svg drop/i });
    const file = new File(["not an svg"], "notes.txt", { type: "text/plain" });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByRole("alert").textContent).toMatch(/svg/i);
    expect(onImport).not.toHaveBeenCalled();
  });

  it("opens a file picker on click and imports the chosen SVG file", async () => {
    const onImport = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});
    const svgText =
      '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>';

    render(<SvgDropZone onImport={onImport} />);

    fireEvent.click(screen.getByRole("region", { name: /svg drop/i }));

    expect(clickSpy).toHaveBeenCalled();

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.accept).toMatch(/\.svg/i);

    const file = new File([svgText], "picked.svg", { type: "image/svg+xml" });
    fireEvent.change(input!, { target: { files: [file] } });

    await vi.waitFor(() => {
      expect(onImport).toHaveBeenCalledWith({
        svgText,
        fileName: "picked.svg",
      });
    });

    clickSpy.mockRestore();
  });
});
