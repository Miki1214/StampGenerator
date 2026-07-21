import { afterEach, describe, expect, it, vi } from "vitest";
import { triggerDownload } from "../../src/lib/trigger-download";

describe("triggerDownload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an object URL and clicks a synthetic anchor with the expected download filename", () => {
    const objectUrl = "blob:mock-download-url";
    const createObjectURL = vi.fn(() => objectUrl);
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, "appendChild");
    const removeChild = vi.spyOn(document.body, "removeChild");
    const createElement = vi.spyOn(document, "createElement");

    // Capture the real createElement for non-anchor tags, but spy on anchor creation.
    createElement.mockImplementation((tagName: string) => {
      const el = document.createElementNS("http://www.w3.org/1999/xhtml", tagName);
      if (tagName.toLowerCase() === "a") {
        el.click = click;
      }
      return el;
    });

    const bytes = new Uint8Array([1, 2, 3]);
    const filename = "stamp.stl";

    triggerDownload(bytes, filename);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);

    expect(createElement).toHaveBeenCalledWith("a");
    const anchor = createElement.mock.results.find(
      (r) => (r.value as HTMLElement).tagName.toLowerCase() === "a",
    )?.value as HTMLAnchorElement;
    expect(anchor.download).toBe(filename);
    expect(anchor.href).toBe(objectUrl);
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledWith(anchor);
  });
});
