import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StampSizeSelector } from "../../src/components/StampSizeSelector";

describe("StampSizeSelector", () => {
  it("updates the selected stamp size via radio buttons", () => {
    const onChange = vi.fn();

    render(<StampSizeSelector value={50} onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /80×80/i }));

    expect(onChange).toHaveBeenCalledWith(80);
  });
});
