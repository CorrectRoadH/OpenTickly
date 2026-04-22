import { Navigate, Outlet, createRoute, useRouterState } from "@tanstack/react-router";
import { Suspense } from "react";

import { AuthenticatedAppFrame } from "../app/AuthenticatedAppFrame.tsx";
import { useSessionBootstrapQuery } from "../shared/query/web-shell.ts";
import { resolveHomePath } from "../shared/lib/workspace-routing.ts";
import { parseAcceptInviteSearch } from "../shared/url-state/accept-invite-location.ts";
import { parseInviteStatusJoinedSearch } from "../shared/url-state/invite-status-location.ts";
import { parseResetPasswordSearch } from "../shared/url-state/reset-password-location.ts";
import { rootRoute } from "./root-route.tsx";
import {
  isSessionAccessDenied,
  pageSpinner,
  SessionExpiredRedirect,
  SessionPendingPanel,
  SessionUnavailablePanel,
} from "./route-tree-shared.tsx";
import {
  AcceptInvitePage,
  AccountPage,
  AuthPage,
  ForgotPasswordPage,
  InviteStatusJoinedPage,
  ProfilePage,
  ResetPasswordPage,
  VerifyEmailPage,
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

export const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  component: VerifyEmailRouteComponent,
});

export const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPasswordRouteComponent,
});

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  validateSearch: parseResetPasswordSearch,
  component: ResetPasswordRouteComponent,
});

export const inviteStatusJoinedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invite-status/joined",
  validateSearch: parseInviteStatusJoinedSearch,
  component: InviteStatusJoinedRouteComponent,
});

export const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accept-invite",
  validateSearch: parseAcceptInviteSearch,
  component: AcceptInviteRouteComponent,
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

function VerifyEmailRouteComponent() {
  return (
    <Suspense fallback={pageSpinner}>
      <VerifyEmailPage />
    </Suspense>
  );
}

function ForgotPasswordRouteComponent() {
  return (
    <Suspense fallback={pageSpinner}>
      <ForgotPasswordPage />
    </Suspense>
  );
}

function ResetPasswordRouteComponent() {
  return (
    <Suspense fallback={pageSpinner}>
      <ResetPasswordPage />
    </Suspense>
  );
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

function AcceptInviteRouteComponent() {
  const search = acceptInviteRoute.useSearch();

  return (
    <Suspense fallback={pageSpinner}>
      <AcceptInvitePage token={search.token} />
    </Suspense>
  );
}

type PublicAuthRouteProps = {
  mode: "login" | "register";
};

// `/login` and `/register` branch on session state: already logged in → bounce
// home; otherwise show the form. Split into three named pieces so the
// dispatcher reads top-to-bottom without duplicated Suspense blocks.
function PublicAuthRoute({ mode }: PublicAuthRouteProps) {
  const sessionQuery = useSessionBootstrapQuery();

  if (sessionQuery.isPending) {
    return <SessionPendingPanel />;
  }

  // Session bootstrap succeeded → user is already authenticated.
  if (sessionQuery.data && !sessionQuery.isError) {
    return <LoggedInHomeRedirect />;
  }

  // 401/403 (normal unauthenticated) or any other failure → treat as logged
  // out and show the form. We don't differentiate because the outcome is the
  // same and `isSessionAccessDenied` is just a subset of `isError`.
  return <PublicAuthForm mode={mode} />;
}

function LoggedInHomeRedirect() {
  return <Navigate replace to={resolveHomePath()} />;
}

function PublicAuthForm({ mode }: PublicAuthRouteProps) {
  return (
    <Suspense fallback={pageSpinner}>
      <AuthPage mode={mode} />
    </Suspense>
  );
}
