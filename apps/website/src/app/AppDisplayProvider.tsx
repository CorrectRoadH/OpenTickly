import { BaseProvider } from "baseui";
import { appThemes } from "@opentickly/web-ui";
import { type ReactNode } from "react";
import { Client as Styletron } from "styletron-engine-atomic";
import { Provider as StyletronProvider } from "styletron-react";

import { ThemeProvider, useTheme } from "./theme-context.tsx";

const styletron = new Styletron();

type AppDisplayProviderProps = {
  children: ReactNode;
};

// App runtime wiring stays in the app layer so shared UI code cannot quietly
// take ownership of website providers, router composition, or session bootstrap.
export function AppDisplayProvider({ children }: AppDisplayProviderProps) {
  return (
    <ThemeProvider>
      <ThemedDisplayProvider>{children}</ThemedDisplayProvider>
    </ThemeProvider>
  );
}

function ThemedDisplayProvider({ children }: AppDisplayProviderProps) {
  const { resolvedTheme } = useTheme();
  return (
    <StyletronProvider value={styletron}>
      <BaseProvider theme={appThemes[resolvedTheme]}>{children}</BaseProvider>
    </StyletronProvider>
  );
}
