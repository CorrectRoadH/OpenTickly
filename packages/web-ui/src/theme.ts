import { LightTheme } from "baseui";

// Shared UI owns the visual baseline tokens, while the website app owns the
// provider/runtime composition that applies them at runtime.
export const appTheme = {
  ...LightTheme,
  colors: {
    ...LightTheme.colors,
    backgroundPrimary: "#1b1b1b",
    backgroundSecondary: "#232323",
    backgroundTertiary: "#242424",
    backgroundInversePrimary: "#fafafa",
    borderOpaque: "#3a3a3a",
    contentPrimary: "#ffffff",
    contentSecondary: "#a4a4a4",
    contentInversePrimary: "#121212",
    accent: "#e57bd9",
    accent50: "#472443",
    accent100: "#56305b",
    accent200: "#724178",
    accent300: "#94519b",
    accent400: "#b767bf",
    accent500: "#cd7fc2",
    accent600: "#e57bd9",
    accent700: "#f7d0f0",
  },
};
