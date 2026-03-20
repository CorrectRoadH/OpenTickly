import { LightTheme } from "baseui";

// Shared UI owns the visual baseline tokens, while the website app owns the
// provider/runtime composition that applies them at runtime.
export const appTheme = {
  ...LightTheme,
  colors: {
    ...LightTheme.colors,
    backgroundPrimary: "#f8fbf7",
    backgroundSecondary: "#eef4ef",
    borderOpaque: "#d9e6dc",
    contentPrimary: "#163227",
    contentSecondary: "#53665b",
  },
};
