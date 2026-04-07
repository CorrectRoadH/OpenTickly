import { Navigate, Outlet, createRoute, useRouterState } from "@tanstack/react-router";
import { Suspense } from "react";

import { AuthenticatedAppFrame } from "../app/AuthenticatedAppFrame.tsx";
import { useSessionBootstrapQuery } from "../shared/query/web-shell.ts";
import { resolveHomePath } from "../shared/lib/workspace-routing.ts";
import { parseInviteStatusJoinedSearch } from "../shared/url-state/invite-status-location.ts";
import { rootRoute } from "./root-route.tsx";
import {
  isSessionAccessDenied,
  pageSpinner,
  SessionExpiredRedirect,
  SessionPendingPanel,
  SessionUnavailablePanel,
} from "./route-tree-shared.tsx";
import {
  AccountPage,
  AuthPage,
  InviteStatusJoinedPage,
  ProfilePage,
} from "./route-tree-lazy-pages.tsx";

/* ---------- protected layout route ---------- */
// Session guard lives here once. Child routes never re-check the session,
// so navigating between siblings never flashes a loading/login screen.

function useWorkspaceIdFromUrl(): number | undefined {
  const params = useRouterState({
    select: (state) => (state.matches.at(-1)?.params ?? {}) as Record<string, string>,
  });
  const raw = params.workspaceId;
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

function ProtectedLayoutComponent() {
  const sessionQuery = useSessionBootstrapQuery();
  const requestedWorkspaceId = useWorkspaceIdFromUrl();

  if (sessionQuery.isPending) {
    return <SessionPendingPanel />;
  }

  if (isSessionAccessDenied(sessionQuery.error)) {
    return <SessionExpiredRedirect />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <SessionUnavailablePanel />;
  }

  return (
    <AuthenticatedAppFrame
      requestedWorkspaceId={requestedWorkspaceId}
      sessionBootstrap={sessionQuery.data}
    >
      <Suspense fallback={pageSpinner}>
        <Outlet />
      </Suspense>
    </AuthenticatedAppFrame>
  );
}

export const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedLayoutComponent,
});

export const homeRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/",
  component: HomeRouteComponent,
});

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginRouteComponent,
});

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterRouteComponent,
});

export const inviteStatusJoinedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invite-status/joined",
  validateSearch: parseInviteStatusJoinedSearch,
  component: InviteStatusJoinedRouteComponent,
});

export const accountRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/account",
  component: AccountRouteComponent,
});

export const profileRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/profile",
  component: ProfileRouteComponent,
});

/* ---------- route components ---------- */

function HomeRouteComponent() {
  return <Navigate replace to={resolveHomePath()} />;
}

function AccountRouteComponent() {
  return <AccountPage />;
}

function ProfileRouteComponent() {
  return <ProfilePage />;
}

function LoginRouteComponent() {
  return <PublicAuthRoute mode="login" />;
}

function RegisterRouteComponent() {
  return <PublicAuthRoute mode="register" />;
}

function InviteStatusJoinedRouteComponent() {
  const search = inviteStatusJoinedRoute.useSearch();

  return (
    <Suspense fallback={pageSpinner}>
      <InviteStatusJoinedPage
        workspaceId={search.workspaceId}
        workspaceName={search.workspaceName}
      />
    </Suspense>
  );
}

type PublicAuthRouteProps = {
  mode: "login" | "register";
};

function PublicAuthRoute({ mode }: PublicAuthRouteProps) {
  const sessionQuery = useSessionBootstrapQuery();

  if (sessionQuery.isPending) {
    return <SessionPendingPanel />;
  }

  if (isSessionAccessDenied(sessionQuery.error)) {
    return (
      <Suspense fallback={pageSpinner}>
        <AuthPage mode={mode} />
      </Suspense>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <Suspense fallback={pageSpinner}>
        <AuthPage mode={mode} />
      </Suspense>
    );
  }

  return <Navigate replace to={resolveHomePath()} />;
}
