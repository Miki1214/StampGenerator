import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SvgDropZone } from "../../src/components/SvgDropZone";

describe("SvgDropZone", () => {
  it("calls its import callback with the dropped file's raw text contents on drop", async () => {
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
      expect(onImport).toHaveBeenCalledWith(svgText);
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
});
