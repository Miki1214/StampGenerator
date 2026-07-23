import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StampPreview } from "../../src/components/StampPreview";

describe("StampPreview", () => {
  it("renders an idle placeholder when there is no mesh", () => {
    render(<StampPreview mesh={null} status="idle" />);
    expect(
      screen.getByText("Draw or import a design to preview the stamp"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reset camera" })).toBeNull();
  });

  it("renders a building placeholder while the mesh is rebuilding", () => {
    render(<StampPreview mesh={null} status="building" />);
    expect(screen.getByText("Building preview...")).toBeTruthy();
  });

  it("shows Reset camera and a locked inset when a ready mesh is present", () => {
    const mesh = {
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      triangleIndices: new Uint32Array([0, 1, 2]),
    };
    render(<StampPreview mesh={mesh} status="ready" />);
    expect(screen.getByRole("button", { name: "Reset camera" })).toBeTruthy();
    expect(screen.getByTestId("stamp-preview-inset")).toBeTruthy();
  });
});
