import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../src/App";

describe("Stamp Generator app shell", () => {
  it("renders the Stamp Generator brand so the Static Web App serves a recognizable page", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Stamp Generator" }),
    ).toBeTruthy();
  });

  it("renders Design, Preview, and Export sections", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /Design/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Preview/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Export/i })).toBeTruthy();
  });

  it("nests text tools under Draw, collapsed by default, without a Text tab", () => {
    render(<App />);
    expect(screen.queryByRole("tab", { name: /text/i })).toBeNull();
    const toggle = screen.getByRole("button", {
      name: /add typography to the stamp/i,
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /import text/i })).toBeNull();
  });
});
