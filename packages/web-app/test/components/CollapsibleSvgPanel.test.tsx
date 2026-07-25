import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CollapsibleSvgPanel } from "../../src/components/CollapsibleSvgPanel";

describe("CollapsibleSvgPanel", () => {
  it("is collapsed by default and expands to reveal size/position controls and drop zone", () => {
    render(
      <CollapsibleSvgPanel onImport={() => {}} frameUnits={400} />,
    );

    expect(
      screen.queryByRole("region", { name: /svg drop/i }),
    ).toBeNull();
    expect(screen.queryByLabelText(/size \(% of stamp\)/i)).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: /add vector artwork to the stamp/i,
      }),
    );

    expect(
      screen.getByRole("region", { name: /svg drop/i }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/size \(% of stamp\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/position x \(%\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/position y \(%\)/i)).toBeTruthy();
  });

  it("forwards dropped SVG with placement derived from panel controls", async () => {
    const onImport = vi.fn();
    const svgText =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';

    render(
      <CollapsibleSvgPanel onImport={onImport} frameUnits={400} />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /add vector artwork to the stamp/i,
      }),
    );

    fireEvent.change(screen.getByLabelText(/size \(% of stamp\)/i), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText(/position x \(%\)/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/position y \(%\)/i), {
      target: { value: "-5" },
    });

    const dropZone = screen.getByRole("region", { name: /svg drop/i });
    const file = new File([svgText], "stamp.svg", { type: "image/svg+xml" });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await vi.waitFor(() => {
      expect(onImport).toHaveBeenCalledWith({
        svgText,
        placement: {
          frameUnits: 400,
          sizeFraction: 0.25,
          offsetXFraction: 0.1,
          offsetYFraction: -0.05,
        },
      });
    });
  });
});
