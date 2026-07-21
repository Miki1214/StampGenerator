import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DownloadButton } from "../../src/components/DownloadButton";

describe("DownloadButton", () => {
  it("is disabled while pipeline state is importing, validating, or invalid", () => {
    const onDownload = vi.fn(() => new Uint8Array([1, 2, 3]));

    const { rerender } = render(
      <DownloadButton state={{ status: "importing" }} onDownload={onDownload} />,
    );
    expect(
      (screen.getByRole("button", { name: /download/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    rerender(
      <DownloadButton
        state={{ status: "validating" }}
        onDownload={onDownload}
      />,
    );
    expect(
      (screen.getByRole("button", { name: /download/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    rerender(
      <DownloadButton
        state={{
          status: "invalid",
          issues: [{ code: "EMPTY_DESIGN", message: "empty" }],
        }}
        onDownload={onDownload}
      />,
    );
    expect(
      (screen.getByRole("button", { name: /download/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
