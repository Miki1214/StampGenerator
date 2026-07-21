import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DrawingCanvas } from "../../src/components/DrawingCanvas";

describe("DrawingCanvas", () => {
  it("calls onImport with a FabricCanvasLike when the import drawing control is clicked", () => {
    const onImport = vi.fn();

    render(<DrawingCanvas onImport={onImport} />);

    fireEvent.click(screen.getByRole("button", { name: /import drawing/i }));

    expect(onImport).toHaveBeenCalledTimes(1);
    const canvasArg = onImport.mock.calls[0][0];
    expect(canvasArg).toEqual(
      expect.objectContaining({
        getObjects: expect.any(Function),
      }),
    );
    expect(Array.isArray(canvasArg.getObjects())).toBe(true);
  });
});
