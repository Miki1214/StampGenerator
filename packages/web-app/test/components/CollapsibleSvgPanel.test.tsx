import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CollapsibleSvgPanel } from "../../src/components/CollapsibleSvgPanel";
import type { SvgLayer } from "../../src/components/SvgInputPanel";

const SAMPLE_LAYER: SvgLayer = {
  id: "layer-1",
  label: "star",
  svgText:
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
  placement: {
    frameUnits: 400,
    sizeFraction: 0.4,
    offsetXFraction: 0,
    offsetYFraction: 0,
  },
};

describe("CollapsibleSvgPanel", () => {
  it("is collapsed by default and expands to reveal size control, drag hint, and drop zone without numeric position controls", () => {
    render(
      <CollapsibleSvgPanel
        onImport={() => {}}
        onRemove={() => {}}
        layers={[]}
        selectedId={null}
        onSelect={() => {}}
        frameUnits={400}
      />,
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
    expect(screen.queryByLabelText(/position x \(%\)/i)).toBeNull();
    expect(screen.queryByLabelText(/position y \(%\)/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /reposition/i })).toBeNull();
    expect(
      screen.getByText(/click and drag an svg on the canvas to reposition/i),
    ).toBeTruthy();
    expect(screen.getByText(/use the handle to rotate/i)).toBeTruthy();
  });

  it("lists uploaded SVGs and imports drops centered with the chosen size", async () => {
    const onImport = vi.fn();
    const onSelect = vi.fn();
    const svgText =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';

    render(
      <CollapsibleSvgPanel
        onImport={onImport}
        onRemove={() => {}}
        layers={[SAMPLE_LAYER]}
        selectedId="layer-1"
        onSelect={onSelect}
        frameUnits={400}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /add vector artwork to the stamp/i,
      }),
    );

    expect(screen.getByRole("option", { name: /star/i })).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/size \(% of stamp\)/i), {
      target: { value: "30" },
    });
    const dropZone = screen.getByRole("region", { name: /svg drop/i });
    const file = new File([svgText], "badge.svg", { type: "image/svg+xml" });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await vi.waitFor(() => {
      expect(onImport).toHaveBeenCalledWith({
        svgText,
        fileName: "badge.svg",
        placement: {
          frameUnits: 400,
          sizeFraction: 0.3,
          offsetXFraction: 0,
          offsetYFraction: 0,
        },
      });
    });
  });

  it("calls onRemove with the layer id when its X button is clicked", () => {
    const onRemove = vi.fn();

    render(
      <CollapsibleSvgPanel
        onImport={() => {}}
        onRemove={onRemove}
        layers={[SAMPLE_LAYER]}
        selectedId="layer-1"
        onSelect={() => {}}
        frameUnits={400}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /add vector artwork to the stamp/i,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /remove star/i }));

    expect(onRemove).toHaveBeenCalledWith("layer-1");
  });
});
