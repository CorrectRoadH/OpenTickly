import { type ReactElement, type ReactNode, useEffect } from "react";

import type { WebSessionBootstrapDto } from "../shared/api/web-contract.ts";
import { usePreferencesQuery } from "../shared/query/web-shell.ts";
import { SessionProvider } from "../shared/session/session-context.tsx";
import { AppShell } from "./AppShell.tsx";
import i18n from "./i18n.ts";

type AuthenticatedAppFrameProps = {
  children: ReactNode;
  requestedWorkspaceId?: number;
  sessionBootstrap: WebSessionBootstrapDto;
};

export function AuthenticatedAppFrame({
  children,
  requestedWorkspaceId,
  sessionBootstrap,
}: AuthenticatedAppFrameProps): ReactElement {
  return (
    <SessionProvider
      requestedWorkspaceId={requestedWorkspaceId}
      sessionBootstrap={sessionBootstrap}
    >
      <LanguageSync />
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}

function LanguageSync(): null {
  const preferencesQuery = usePreferencesQuery();
  const languageCode = preferencesQuery.data?.language_code;

  useEffect(() => {
    if (languageCode && languageCode !== i18n.language) {
      void i18n.changeLanguage(languageCode);
    }
  }, [languageCode]);

  return null;
}
