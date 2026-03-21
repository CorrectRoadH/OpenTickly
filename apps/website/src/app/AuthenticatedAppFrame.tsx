import { type ReactElement, type ReactNode } from "react";

import type { WebSessionBootstrapDto } from "../shared/api/web-contract.ts";
import { mapSessionBootstrap } from "../entities/session/session-bootstrap.ts";
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
  const session = mapSessionBootstrap(sessionBootstrap, {
    requestedWorkspaceId,
  });

  return (
    <SessionProvider value={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
