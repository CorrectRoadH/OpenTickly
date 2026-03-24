import { AppPanel } from "@opentoggl/web-ui";
import { Navigate, createRoute, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";

import { AuthenticatedAppFrame } from "../app/AuthenticatedAppFrame.tsx";
import { WebApiError } from "../shared/api/web-client.ts";
import { useSessionBootstrapQuery } from "../shared/query/web-shell.ts";
import { resolveHomePath } from "../shared/lib/workspace-routing.ts";
import { parseInviteStatusJoinedSearch } from "../shared/url-state/invite-status-location.ts";
import {
  buildProjectTeamPath,
  parseProjectsSearch,
} from "../shared/url-state/projects-location.ts";
import { parseTasksSearch } from "../shared/url-state/tasks-location.ts";
import {
  buildWorkspaceSettingsPath,
  normalizeWorkspaceSettingsSection,
  parseLegacyWorkspaceSettingsSearch,
} from "../shared/url-state/workspace-settings-location.ts";
import { AuthPage } from "../pages/auth/AuthPage.tsx";
import { InviteStatusJoinedPage } from "../pages/members/InviteStatusJoinedPage.tsx";
import { WorkspaceImportPage } from "../pages/import/WorkspaceImportPage.tsx";
import { ProfilePage } from "../pages/profile/ProfilePage.tsx";
import { OrganizationSettingsPage } from "../pages/settings/OrganizationSettingsPage.tsx";
import { WorkspaceSettingsPage } from "../pages/settings/WorkspaceSettingsPage.tsx";
import { WorkspaceOverviewPage } from "../pages/shell/WorkspaceOverviewPage.tsx";
import { WorkspaceReportsPage } from "../pages/shell/WorkspaceReportsPage.tsx";
import { WorkspaceTimerPage } from "../pages/shell/WorkspaceTimerPage.tsx";
import { WorkspaceMembersPage } from "../pages/members/WorkspaceMembersPage.tsx";
import { PermissionConfigPage } from "../pages/permission-config/PermissionConfigPage.tsx";
import { ProjectsPage } from "../pages/projects/ProjectsPage.tsx";
import { ProjectDetailPage } from "../pages/projects/ProjectDetailPage.tsx";
import { ClientsPage } from "../pages/clients/ClientsPage.tsx";
import { ClientDetailPage } from "../pages/clients/ClientDetailPage.tsx";
import { GroupsPage } from "../pages/groups/GroupsPage.tsx";
import { TasksPage } from "../pages/tasks/TasksPage.tsx";
import { TagsPage } from "../pages/tags/TagsPage.tsx";
import { TagDetailPage } from "../pages/tags/TagDetailPage.tsx";
import { rootRoute } from "./root-route.tsx";

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeRouteComponent,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginRouteComponent,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterRouteComponent,
});

const inviteStatusJoinedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invite-status/joined",
  validateSearch: parseInviteStatusJoinedSearch,
  component: InviteStatusJoinedRouteComponent,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfileRouteComponent,
});

const workspaceOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/overview",
  component: WorkspaceOverviewRouteComponent,
});

const workspaceTimerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/timer",
  component: WorkspaceTimerRouteComponent,
});

const workspaceReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/reports",
  component: WorkspaceReportsRouteComponent,
});

const workspaceProjectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$workspaceId/list",
  validateSearch: parseProjectsSearch,
  component: WorkspaceProjectsRouteComponent,
});

const workspaceProjectDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$workspaceId/projects/$projectId/team",
  component: WorkspaceProjectDetailRouteComponent,
});

const legacyWorkspaceProjectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/projects",
  validateSearch: parseProjectsSearch,
  component: LegacyWorkspaceProjectsRouteComponent,
});

const legacyWorkspaceProjectDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/projects/$projectId",
  component: LegacyWorkspaceProjectDetailRouteComponent,
});

const workspaceMembersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/members",
  component: WorkspaceMembersRouteComponent,
});

const workspaceImportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/import",
  component: WorkspaceImportRouteComponent,
});

const workspaceClientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/clients",
  component: WorkspaceClientsRouteComponent,
});

const workspaceClientDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/clients/$clientId",
  component: WorkspaceClientDetailRouteComponent,
});

const workspaceGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/groups",
  component: WorkspaceGroupsRouteComponent,
});

const workspacePermissionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/permissions",
  component: WorkspacePermissionsRouteComponent,
});

const workspaceTasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/tasks",
  validateSearch: parseTasksSearch,
  component: WorkspaceTasksRouteComponent,
});

const workspaceTagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/tags",
  component: WorkspaceTagsRouteComponent,
});

const workspaceTagDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/tags/$tagId",
  component: WorkspaceTagDetailRouteComponent,
});

const workspaceSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$workspaceId/settings/$section",
  component: WorkspaceSettingsRouteComponent,
});

const legacyWorkspaceSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/settings",
  validateSearch: parseLegacyWorkspaceSettingsSearch,
  component: LegacyWorkspaceSettingsRouteComponent,
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
  inviteStatusJoinedRoute,
  profileRoute,
  workspaceOverviewRoute,
  workspaceTimerRoute,
  workspaceReportsRoute,
  workspaceProjectsRoute,
  workspaceProjectDetailRoute,
  legacyWorkspaceProjectsRoute,
  legacyWorkspaceProjectDetailRoute,
  workspaceMembersRoute,
  workspaceImportRoute,
  workspaceClientsRoute,
  workspaceClientDetailRoute,
  workspaceGroupsRoute,
  workspacePermissionsRoute,
  workspaceTasksRoute,
  workspaceTagsRoute,
  workspaceTagDetailRoute,
  workspaceSettingsRoute,
  legacyWorkspaceSettingsRoute,
  organizationSettingsRoute,
]);

function HomeRouteComponent() {
  const sessionQuery = useSessionBootstrapQuery();

  if (sessionQuery.isPending) {
    return <SessionPendingPanel />;
  }

  if (isSessionAccessDenied(sessionQuery.error)) {
    return <Navigate replace to="/login" />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <SessionUnavailablePanel />;
  }

  return <Navigate replace to={resolveHomePath()} />;
}

function ProfileRouteComponent() {
  return renderProtectedRoute(<ProfilePage />);
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
    <InviteStatusJoinedPage workspaceId={search.workspaceId} workspaceName={search.workspaceName} />
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
    return <AuthPage mode={mode} />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <AuthPage mode={mode} />;
  }

  return <Navigate replace to={resolveHomePath()} />;
}

function WorkspaceOverviewRouteComponent() {
  return renderProtectedRoute(<WorkspaceOverviewPage />);
}

function WorkspaceTimerRouteComponent() {
  return renderProtectedRoute(<WorkspaceTimerPage />);
}

function WorkspaceReportsRouteComponent() {
  const params = workspaceReportsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<WorkspaceReportsPage />, workspaceId);
}

function WorkspaceProjectsRouteComponent() {
  const params = workspaceProjectsRoute.useParams();
  const search = workspaceProjectsRoute.useSearch();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<ProjectsPage statusFilter={search.status} />, workspaceId);
}

function LegacyWorkspaceProjectsRouteComponent() {
  const params = legacyWorkspaceProjectsRoute.useParams();
  const search = legacyWorkspaceProjectsRoute.useSearch();

  return (
    <Navigate
      replace
      params={{ workspaceId: params.workspaceId }}
      search={search}
      to="/projects/$workspaceId/list"
    />
  );
}

function WorkspaceProjectDetailRouteComponent() {
  const params = workspaceProjectDetailRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const projectId = Number(params.projectId);

  return renderProtectedRoute(
    <ProjectDetailPage projectId={projectId} workspaceId={workspaceId} />,
    workspaceId,
  );
}

function LegacyWorkspaceProjectDetailRouteComponent() {
  const params = legacyWorkspaceProjectDetailRoute.useParams();

  return (
    <Navigate
      replace
      to={buildProjectTeamPath(Number(params.workspaceId), Number(params.projectId))}
    />
  );
}

function WorkspaceMembersRouteComponent() {
  const params = workspaceMembersRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<WorkspaceMembersPage />, workspaceId);
}

function WorkspaceImportRouteComponent() {
  const params = workspaceImportRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<WorkspaceImportPage />, workspaceId);
}

function WorkspaceClientsRouteComponent() {
  const params = workspaceClientsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<ClientsPage />, workspaceId);
}

function WorkspaceClientDetailRouteComponent() {
  const params = workspaceClientDetailRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const clientId = Number(params.clientId);

  return renderProtectedRoute(
    <ClientDetailPage clientId={clientId} workspaceId={workspaceId} />,
    workspaceId,
  );
}

function WorkspaceGroupsRouteComponent() {
  const params = workspaceGroupsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<GroupsPage />, workspaceId);
}

function WorkspacePermissionsRouteComponent() {
  const params = workspacePermissionsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<PermissionConfigPage workspaceId={workspaceId} />, workspaceId);
}

function WorkspaceTasksRouteComponent() {
  const params = workspaceTasksRoute.useParams();
  const search = workspaceTasksRoute.useSearch();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<TasksPage projectId={search.projectId} />, workspaceId);
}

function WorkspaceTagsRouteComponent() {
  const params = workspaceTagsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<TagsPage />, workspaceId);
}

function WorkspaceTagDetailRouteComponent() {
  const params = workspaceTagDetailRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const tagId = Number(params.tagId);

  return renderProtectedRoute(
    <TagDetailPage tagId={tagId} workspaceId={workspaceId} />,
    workspaceId,
  );
}

function WorkspaceSettingsRouteComponent() {
  const params = workspaceSettingsRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const section = normalizeWorkspaceSettingsSection(params.section);

  return renderProtectedRoute(
    <WorkspaceSettingsPage section={section} workspaceId={workspaceId} />,
    workspaceId,
  );
}

function LegacyWorkspaceSettingsRouteComponent() {
  const params = legacyWorkspaceSettingsRoute.useParams();
  const search = legacyWorkspaceSettingsRoute.useSearch();

  return (
    <Navigate
      replace
      to={buildWorkspaceSettingsPath({
        section: normalizeWorkspaceSettingsSection(search.section),
        workspaceId: Number(params.workspaceId),
      })}
    />
  );
}

function OrganizationSettingsRouteComponent() {
  const params = organizationSettingsRoute.useParams();
  const organizationId = Number(params.organizationId);

  return renderProtectedRoute(<OrganizationSettingsPage organizationId={organizationId} />);
}

function renderProtectedRoute(children: ReactNode, requestedWorkspaceId?: number) {
  return (
    <ProtectedRouteBoundary requestedWorkspaceId={requestedWorkspaceId}>
      {children}
    </ProtectedRouteBoundary>
  );
}

type ProtectedRouteBoundaryProps = {
  children: ReactNode;
  requestedWorkspaceId?: number;
};

function ProtectedRouteBoundary({ children, requestedWorkspaceId }: ProtectedRouteBoundaryProps) {
  const sessionQuery = useSessionBootstrapQuery();

  if (sessionQuery.isPending) {
    return <SessionPendingPanel />;
  }

  if (isSessionAccessDenied(sessionQuery.error)) {
    return <Navigate replace to="/login" />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <SessionUnavailablePanel />;
  }

  return (
    <AuthenticatedAppFrame
      requestedWorkspaceId={requestedWorkspaceId}
      sessionBootstrap={sessionQuery.data}
    >
      {children}
    </AuthenticatedAppFrame>
  );
}

function SessionPendingPanel() {
  return (
    <div className="min-h-screen px-4 py-8">
      <AppPanel className="mx-auto max-w-2xl bg-white/95">
        <p className="text-sm font-medium text-slate-700">Loading session…</p>
      </AppPanel>
    </div>
  );
}

function SessionUnavailablePanel() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <div className="min-h-screen px-4 py-8">
      <AppPanel className="mx-auto max-w-2xl bg-white/95">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Session unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The shell could not bootstrap the current session from
          <code className="mx-1 rounded bg-slate-100 px-2 py-1 text-xs">/web/v1/session</code>
          while rendering {pathname}.
        </p>
      </AppPanel>
    </div>
  );
}

function isSessionAccessDenied(error: unknown) {
  return error instanceof WebApiError && (error.status === 401 || error.status === 403);
}
