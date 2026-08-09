import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemePreferenceControl } from "./ThemePreferenceControl.tsx";
import { ThemeProvider } from "./theme-context.tsx";
import { THEME_STORAGE_KEY } from "./theme-runtime.ts";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      matches: true,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      removeEventListener: vi.fn(),
    }),
  );
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
  vi.unstubAllGlobals();
});

describe("ThemePreferenceControl", () => {
  it("switches from the system appearance to a persisted light appearance", () => {
    render(
      <ThemeProvider>
        <ThemePreferenceControl />
      </ThemeProvider>,
    );

    expect(screen.getByRole("button", { name: "themeSystem" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "themeLight" }));

    expect(screen.getByRole("button", { name: "themeLight" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});
