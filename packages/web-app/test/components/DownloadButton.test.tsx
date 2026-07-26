import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DownloadButton } from "../../src/components/DownloadButton";
import { triggerDownload } from "../../src/lib/trigger-download";

vi.mock("../../src/lib/trigger-download", () => ({
  triggerDownload: vi.fn(),
}));

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

  it("is enabled when pipeline state is ready", () => {
    render(
      <DownloadButton
        state={{ status: "ready", shapes: [] }}
        onDownload={vi.fn(() => new Uint8Array([1]))}
      />,
    );

    expect(
      (screen.getByRole("button", { name: /download/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("can be enabled via the disabled override even when the pipeline is idle", () => {
    render(
      <DownloadButton
        state={{ status: "idle" }}
        disabled={false}
        onDownload={vi.fn(() => new Uint8Array([1]))}
      />,
    );

    expect(
      (screen.getByRole("button", { name: /download/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("calls triggerDownload with a non-empty byte array when clicked in the ready state", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);

    render(
      <DownloadButton
        state={{ status: "ready", shapes: [] }}
        onDownload={() => bytes}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    await vi.waitFor(() => {
      expect(triggerDownload).toHaveBeenCalledTimes(1);
    });
    const [passedBytes] = vi.mocked(triggerDownload).mock.calls[0];
    expect(passedBytes).toBeInstanceOf(Uint8Array);
    expect(passedBytes.length).toBeGreaterThan(0);
  });
});
