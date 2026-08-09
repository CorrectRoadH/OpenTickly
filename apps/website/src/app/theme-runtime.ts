export type ResolvedTheme = "dark" | "light";
export type ThemePreference = ResolvedTheme | "system";

export const THEME_STORAGE_KEY = "opentickly:theme";

const themeColors: Record<ResolvedTheme, string> = {
  dark: "#1b1b1b",
  light: "#f7f7f8",
};

export function getStoredThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function setStoredThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Theme selection still works for this page when storage is unavailable.
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const resolvedTheme = resolveTheme(preference);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;

  const meta = ensureThemeColorMeta();
  meta.content = themeColors[resolvedTheme];
  return resolvedTheme;
}

function ensureThemeColorMeta(): HTMLMetaElement {
  const existing = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (existing) return existing;

  const meta = document.createElement("meta");
  meta.name = "theme-color";
  document.head.append(meta);
  return meta;
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}
