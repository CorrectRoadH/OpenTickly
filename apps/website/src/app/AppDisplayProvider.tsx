import { BaseProvider } from "baseui";
import { appTheme } from "@opentoggl/web-ui";
import { type ReactNode } from "react";
import { Client as Styletron } from "styletron-engine-atomic";
import { Provider as StyletronProvider } from "styletron-react";

const styletron = new Styletron();

type AppDisplayProviderProps = {
  children: ReactNode;
};

// App runtime wiring stays in the app layer so shared UI code cannot quietly
// take ownership of website providers, router composition, or session bootstrap.
export function AppDisplayProvider({ children }: AppDisplayProviderProps) {
  return (
    <StyletronProvider value={styletron}>
      <BaseProvider theme={appTheme}>{children}</BaseProvider>
    </StyletronProvider>
  );
}
