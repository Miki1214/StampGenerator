import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../src/App";

describe("placeholder landing page", () => {
  it("renders the Stamp Generator brand so the Static Web App serves a recognizable page", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Stamp Generator" }),
    ).toBeTruthy();
  });
});
