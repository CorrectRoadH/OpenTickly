import { type ReactElement, type ReactNode, useEffect, useState } from "react";

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
      <LanguageSync>
        <AppShell>{children}</AppShell>
        <OnboardingDialog />
      </LanguageSync>
    </SessionProvider>
  );
}

/**
 * Blocks children from rendering until the user's language preference has been
 * applied to i18n. This prevents an English-flash on reload for non-English
 * users and removes the need for timeout hacks in E2E tests.
 */
export function LanguageSync({ children }: { children?: ReactNode }): ReactNode {
  const preferencesQuery = usePreferencesQuery();
  const languageCode = normalizeSupportedLanguage(preferencesQuery.data?.language_code);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (preferencesQuery.isPending) {
      return;
    }
    const normalizedCurrent = normalizeSupportedLanguage(i18n.language);
    if (languageCode && languageCode !== normalizedCurrent) {
      void i18n.changeLanguage(languageCode).then(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [languageCode, preferencesQuery.isPending]);

  if (!ready) {
    return null;
  }

  return children ?? null;
}
