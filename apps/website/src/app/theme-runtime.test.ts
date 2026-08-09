import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyThemePreference,
  getStoredThemePreference,
  setStoredThemePreference,
  THEME_STORAGE_KEY,
} from "./theme-runtime.ts";

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
  document.head.querySelector('meta[name="theme-color"]')?.remove();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("theme runtime", () => {
  it("uses the operating-system theme when no preference is stored", () => {
    vi.stubGlobal("matchMedia", createMatchMedia(true));

    expect(applyThemePreference("system")).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("applies an explicit light preference independently of the operating system", () => {
    vi.stubGlobal("matchMedia", createMatchMedia(true));
    document.head.insertAdjacentHTML("beforeend", '<meta name="theme-color" content="#000000">');

    expect(applyThemePreference("light")).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(document.head.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#f7f7f8",
    );
  });

  it("persists only supported preferences", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(getStoredThemePreference()).toBe("system");

    setStoredThemePreference("dark");
    expect(getStoredThemePreference()).toBe("dark");
  });
});

function createMatchMedia(matches: boolean): typeof window.matchMedia {
  return vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    removeEventListener: vi.fn(),
  });
}
