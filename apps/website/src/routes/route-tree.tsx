import { Navigate, createRoute } from "@tanstack/react-router";

import { AuthenticatedAppFrame } from "../app/AuthenticatedAppFrame.tsx";
import { mapSessionBootstrap } from "../entities/session/session-bootstrap.ts";
import { WebApiError } from "../shared/api/web-client.ts";
import { useSessionBootstrapQuery } from "../shared/query/web-shell.ts";
import { resolveHomePath } from "../shared/lib/workspace-routing.ts";
import { parseTasksSearch } from "../shared/url-state/tasks-location.ts";
import { parseWorkspaceSettingsSearch } from "../shared/url-state/workspace-settings-location.ts";
import { AuthPage } from "../pages/auth/AuthPage.tsx";
import { ProfilePage } from "../pages/profile/ProfilePage.tsx";
import { OrganizationSettingsPage } from "../pages/settings/OrganizationSettingsPage.tsx";
import { WorkspaceSettingsPage } from "../pages/settings/WorkspaceSettingsPage.tsx";
import { WorkspaceOverviewPage } from "../pages/shell/WorkspaceOverviewPage.tsx";
import { WorkspaceReportsPage } from "../pages/shell/WorkspaceReportsPage.tsx";
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

const workspaceProjectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/projects",
  component: WorkspaceProjectsRouteComponent,
});

const workspaceProjectDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/projects/$projectId",
  component: WorkspaceProjectDetailRouteComponent,
});

const workspaceMembersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/members",
  component: WorkspaceMembersRouteComponent,
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
  workspaceProjectsRoute,
  workspaceProjectDetailRoute,
  workspaceMembersRoute,
  workspaceClientsRoute,
  workspaceClientDetailRoute,
  workspaceGroupsRoute,
  workspacePermissionsRoute,
  workspaceTasksRoute,
  workspaceTagsRoute,
  workspaceTagDetailRoute,
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

function WorkspaceProjectsRouteComponent() {
  const params = workspaceProjectsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <ProjectsPage />
    </AuthenticatedAppFrame>
  );
}

function WorkspaceProjectDetailRouteComponent() {
  const params = workspaceProjectDetailRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const projectId = Number(params.projectId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <ProjectDetailPage projectId={projectId} workspaceId={workspaceId} />
    </AuthenticatedAppFrame>
  );
}

function WorkspaceMembersRouteComponent() {
  const params = workspaceMembersRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <WorkspaceMembersPage />
    </AuthenticatedAppFrame>
  );
}

function WorkspaceClientsRouteComponent() {
  const params = workspaceClientsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <ClientsPage />
    </AuthenticatedAppFrame>
  );
}

function WorkspaceClientDetailRouteComponent() {
  const params = workspaceClientDetailRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const clientId = Number(params.clientId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <ClientDetailPage clientId={clientId} workspaceId={workspaceId} />
    </AuthenticatedAppFrame>
  );
}

function WorkspaceGroupsRouteComponent() {
  const params = workspaceGroupsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <GroupsPage />
    </AuthenticatedAppFrame>
  );
}

function WorkspacePermissionsRouteComponent() {
  const params = workspacePermissionsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <PermissionConfigPage workspaceId={workspaceId} />
    </AuthenticatedAppFrame>
  );
}

function WorkspaceTasksRouteComponent() {
  const params = workspaceTasksRoute.useParams();
  const search = workspaceTasksRoute.useSearch();
  const workspaceId = Number(params.workspaceId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <TasksPage projectId={search.projectId} />
    </AuthenticatedAppFrame>
  );
}

function WorkspaceTagsRouteComponent() {
  const params = workspaceTagsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <TagsPage />
    </AuthenticatedAppFrame>
  );
}

function WorkspaceTagDetailRouteComponent() {
  const params = workspaceTagDetailRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const tagId = Number(params.tagId);

  return (
    <AuthenticatedAppFrame requestedWorkspaceId={workspaceId}>
      <TagDetailPage tagId={tagId} workspaceId={workspaceId} />
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
