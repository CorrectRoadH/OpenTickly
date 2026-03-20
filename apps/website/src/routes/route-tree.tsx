import { Navigate, createRoute } from "@tanstack/react-router";

import { AuthenticatedAppFrame } from "../app/AuthenticatedAppFrame.tsx";
import { mapSessionBootstrap } from "../entities/session/session-bootstrap.ts";
import { WebApiError } from "../shared/api/web-client.ts";
import { useSessionBootstrapQuery } from "../shared/query/web-shell.ts";
import { resolveHomePath } from "../shared/lib/workspace-routing.ts";
import { parseWorkspaceSettingsSearch } from "../shared/url-state/workspace-settings-location.ts";
import { AuthPage } from "../pages/auth/AuthPage.tsx";
import { ProfilePage } from "../pages/profile/ProfilePage.tsx";
import { OrganizationSettingsPage } from "../pages/settings/OrganizationSettingsPage.tsx";
import { WorkspaceSettingsPage } from "../pages/settings/WorkspaceSettingsPage.tsx";
import { WorkspaceOverviewPage } from "../pages/shell/WorkspaceOverviewPage.tsx";
import { WorkspaceReportsPage } from "../pages/shell/WorkspaceReportsPage.tsx";
import { rootRoute } from "./root-route.tsx";

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeRouteComponent,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: () => <AuthPage mode="login" />,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: () => <AuthPage mode="register" />,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: () => (
    <AuthenticatedAppFrame>
      <ProfilePage />
    </AuthenticatedAppFrame>
  ),
});

const workspaceOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId",
  component: WorkspaceOverviewRouteComponent,
});

const workspaceReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/reports",
  component: WorkspaceReportsRouteComponent,
});

const workspaceSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/settings",
  validateSearch: parseWorkspaceSettingsSearch,
  component: WorkspaceSettingsRouteComponent,
});

const organizationSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/organizations/$organizationId/settings",
  component: OrganizationSettingsRouteComponent,
});

export const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  workspaceOverviewRoute,
  workspaceReportsRoute,
  workspaceSettingsRoute,
  organizationSettingsRoute,
]);

function HomeRouteComponent() {
  const sessionQuery = useSessionBootstrapQuery();

  if (sessionQuery.error instanceof WebApiError && sessionQuery.error.status === 401) {
    return <Navigate to="/login" />;
  }

  if (!sessionQuery.data) {
    return null;
  }

  return <Navigate to={resolveHomePath(mapSessionBootstrap(sessionQuery.data))} />;
}

function WorkspaceOverviewRouteComponent() {
  const params = workspaceOverviewRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <WorkspaceOverviewPage />
    </AuthenticatedAppFrame>
  );
}

function WorkspaceReportsRouteComponent() {
  const params = workspaceReportsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <WorkspaceReportsPage />
    </AuthenticatedAppFrame>
  );
}

function WorkspaceSettingsRouteComponent() {
  const params = workspaceSettingsRoute.useParams();
  const search = workspaceSettingsRoute.useSearch();
  const workspaceId = Number(params.workspaceId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <WorkspaceSettingsPage section={search.section} workspaceId={workspaceId} />
    </AuthenticatedAppFrame>
  );
}

function OrganizationSettingsRouteComponent() {
  const params = organizationSettingsRoute.useParams();
  const organizationId = Number(params.organizationId);

  return (
    <AuthenticatedAppFrame>
      <OrganizationSettingsPage organizationId={organizationId} />
    </AuthenticatedAppFrame>
  );
}
