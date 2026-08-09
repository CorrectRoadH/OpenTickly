import { DarkTheme, LightTheme, type Theme } from "baseui";

// Shared UI owns the visual baseline tokens, while the website app owns the
// provider/runtime composition that applies them at runtime.
function createAppTheme(baseTheme: Theme): Theme {
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      backgroundPrimary: "var(--track-surface)",
      backgroundSecondary: "var(--track-surface-muted)",
      backgroundTertiary: "var(--track-surface-raised)",
      backgroundInversePrimary: "var(--track-text)",
      borderOpaque: "var(--track-border)",
      contentPrimary: "var(--track-text)",
      contentSecondary: "var(--track-text-muted)",
      contentInversePrimary: "var(--track-button-text)",
      accent: "var(--track-accent)",
      accent50: "var(--track-accent-soft)",
      accent100: "var(--track-accent-soft)",
      accent200: "var(--track-accent-soft)",
      accent300: "var(--track-accent)",
      accent400: "var(--track-accent)",
      accent500: "var(--track-accent)",
      accent600: "var(--track-accent)",
      accent700: "var(--track-accent-text)",
    },
  };
}

export const appThemes = {
  dark: createAppTheme(DarkTheme),
  light: createAppTheme(LightTheme),
};
