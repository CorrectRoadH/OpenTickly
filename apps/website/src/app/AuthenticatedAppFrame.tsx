import { type ReactElement, type ReactNode, useEffect } from "react";

import type { WebSessionBootstrapDto } from "../shared/api/web-contract.ts";
import { usePreferencesQuery } from "../shared/query/web-shell.ts";
import { SessionProvider } from "../shared/session/session-context.tsx";
import { AppShell } from "./AppShell.tsx";
import { normalizeSupportedLanguage } from "./i18n.ts";
import i18n from "./i18n.ts";
import { OnboardingDialog } from "../features/onboarding/OnboardingDialog.tsx";

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
      <OnboardingDialog />
    </SessionProvider>
  );
}

function LanguageSync(): null {
  const preferencesQuery = usePreferencesQuery();
  const languageCode = normalizeSupportedLanguage(preferencesQuery.data?.language_code);

  useEffect(() => {
    const normalizedCurrent = normalizeSupportedLanguage(i18n.language);
    if (languageCode && languageCode !== normalizedCurrent) {
      void i18n.changeLanguage(languageCode);
    }
  }, [languageCode]);

  return null;
}
