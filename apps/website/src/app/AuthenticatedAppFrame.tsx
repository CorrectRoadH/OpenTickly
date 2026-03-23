import { type ReactElement, type ReactNode } from "react";

import type { WebSessionBootstrapDto } from "../shared/api/web-contract.ts";
import { SessionProvider } from "../shared/session/session-context.tsx";
import { AppShell } from "./AppShell.tsx";

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
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
