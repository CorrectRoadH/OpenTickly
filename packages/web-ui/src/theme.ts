import { LightTheme } from "baseui";

// Shared UI owns the visual baseline tokens, while the website app owns the
// provider/runtime composition that applies them at runtime.
export const appTheme = {
  ...LightTheme,
  colors: {
    ...LightTheme.colors,
    backgroundPrimary: "var(--track-surface)",
    backgroundSecondary: "var(--track-surface-muted)",
    backgroundTertiary: "var(--track-surface-raised)",
    backgroundInversePrimary: "#fafafa",
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
