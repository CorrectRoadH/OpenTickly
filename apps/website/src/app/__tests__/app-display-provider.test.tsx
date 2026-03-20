// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppButton } from "@opentoggl/web-ui";

import { AppDisplayProvider } from "../AppDisplayProvider.tsx";

describe("app display provider", () => {
  it("renders baseui-backed shared controls inside the app-owned runtime providers", () => {
    render(
      <AppDisplayProvider>
        <AppButton>Start timer</AppButton>
      </AppDisplayProvider>,
    );

    expect(screen.getByRole("button", { name: "Start timer" })).toBeTruthy();
  });

  it("keeps runtime composition out of the shared web-ui package", async () => {
    const webUi = await import("@opentoggl/web-ui");

    expect(webUi).not.toHaveProperty("AppDisplayProvider");
  });
});
