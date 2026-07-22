import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StampSizeSelector } from "../../src/components/StampSizeSelector";

describe("StampSizeSelector", () => {
  it("updates the selected square stamp size via radio buttons", () => {
    const onCanvasSizeChange = vi.fn();

    render(
      <StampSizeSelector
        baseShape="square"
        onBaseShapeChange={() => {}}
        canvasSizeMm={50}
        onCanvasSizeChange={onCanvasSizeChange}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /80×80/i }));

    expect(onCanvasSizeChange).toHaveBeenCalledWith(80);
  });

  it("updates the selected round stamp diameter via radio buttons", () => {
    const onCanvasSizeChange = vi.fn();

    render(
      <StampSizeSelector
        baseShape="round"
        onBaseShapeChange={() => {}}
        canvasSizeMm={50}
        onCanvasSizeChange={onCanvasSizeChange}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /Ø80/i }));

    expect(onCanvasSizeChange).toHaveBeenCalledWith(80);
  });

  it("switches base shape via radio buttons", () => {
    const onBaseShapeChange = vi.fn();

    render(
      <StampSizeSelector
        baseShape="square"
        onBaseShapeChange={onBaseShapeChange}
        canvasSizeMm={50}
        onCanvasSizeChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /^round$/i }));

    expect(onBaseShapeChange).toHaveBeenCalledWith("round");
  });
});
