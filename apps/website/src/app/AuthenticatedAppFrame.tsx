import { AppPanel } from "@opentoggl/web-ui";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";

import { mapSessionBootstrap } from "../entities/session/session-bootstrap.ts";
import { useSessionBootstrapQuery } from "../shared/query/web-shell.ts";
import { SessionProvider } from "../shared/session/session-context.tsx";
import { WebApiError } from "../shared/api/web-client.ts";
import { AppShell } from "./AppShell.tsx";

type AuthenticatedAppFrameProps = {
  children: ReactNode;
  requestedWorkspaceId?: number;
};

export function AuthenticatedAppFrame({
  children,
  requestedWorkspaceId,
}: AuthenticatedAppFrameProps): ReactElement {
  const location = useRouterState({
    select: (state) => state.location,
  });
  const sessionQuery = useSessionBootstrapQuery();

  if (sessionQuery.isPending) {
    return (
      <div className="min-h-screen px-4 py-8">
        <AppPanel className="mx-auto max-w-2xl bg-white/95">
          <p className="text-sm font-medium text-slate-700">Loading session…</p>
        </AppPanel>
      </div>
    );
  }

  if (sessionQuery.error instanceof WebApiError && sessionQuery.error.status === 401) {
    return <Navigate to="/login" />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="min-h-screen px-4 py-8">
        <AppPanel className="mx-auto max-w-2xl bg-white/95">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Session unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The shell could not bootstrap the current session from
            <code className="mx-1 rounded bg-slate-100 px-2 py-1 text-xs">/web/v1/session</code>
            while rendering {location.pathname}.
          </p>
        </AppPanel>
      </div>
    );
  }

  const session = mapSessionBootstrap(sessionQuery.data, {
    requestedWorkspaceId,
  });

  return (
    <SessionProvider value={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
