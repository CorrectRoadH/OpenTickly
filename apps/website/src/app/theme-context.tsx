import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  applyThemePreference,
  getStoredThemePreference,
  type ResolvedTheme,
  setStoredThemePreference,
  type ThemePreference,
} from "./theme-runtime.ts";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const [preference, setPreferenceState] = useState(getStoredThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState(() => applyThemePreference(preference));

  useEffect(() => {
    setResolvedTheme(applyThemePreference(preference));
    if (preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setResolvedTheme(applyThemePreference("system"));
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  function setPreference(nextPreference: ThemePreference): void {
    setStoredThemePreference(nextPreference);
    setPreferenceState(nextPreference);
  }

  return (
    <ThemeContext value={{ preference, resolvedTheme, setPreference }}>{children}</ThemeContext>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
