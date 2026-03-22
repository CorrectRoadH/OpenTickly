import { LightTheme } from "baseui";

// Shared UI owns the visual baseline tokens, while the website app owns the
// provider/runtime composition that applies them at runtime.
export const appTheme = {
  ...LightTheme,
  colors: {
    ...LightTheme.colors,
    backgroundPrimary: "#18181b",
    backgroundSecondary: "#232326",
    backgroundTertiary: "#2b2b31",
    backgroundInversePrimary: "#f4f4f5",
    borderOpaque: "#31313a",
    contentPrimary: "#f4f4f5",
    contentSecondary: "#a1a1aa",
    contentInversePrimary: "#18181b",
    accent: "#d38bd7",
    accent50: "#2e2032",
    accent100: "#4d2c52",
    accent200: "#6c3e74",
    accent300: "#8c5495",
    accent400: "#b56cbc",
    accent500: "#d38bd7",
    accent600: "#dface3",
    accent700: "#e8c7eb",
  },
};
