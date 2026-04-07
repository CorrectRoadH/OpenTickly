import { Navigate, createRoute } from "@tanstack/react-router";

import { parseTasksSearch } from "../shared/url-state/tasks-location.ts";
import { protectedLayoutRoute } from "./route-tree-auth.tsx";
import {
  ApprovalsPage,
  AuditLogPage,
  ClientDetailPage,
  ClientsPage,
  GoalsPage,
  GroupsPage,
  IntegrationsPage,
  InvoiceEditorPage,
  InvoicesPage,
  PermissionConfigPage,
  SubscriptionPage,
  TagDetailPage,
  TagsPage,
  TasksPage,
} from "./route-tree-lazy-pages.tsx";

/* ---------- entity routes (clients, groups, tags, tasks, permissions) ---------- */

export const workspaceClientsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/clients",
  component: WorkspaceClientsRouteComponent,
});

export const workspaceClientDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/clients/$clientId",
  component: WorkspaceClientDetailRouteComponent,
});

export const workspaceGroupsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/groups",
  component: WorkspaceGroupsRouteComponent,
});

export const workspacePermissionsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/permissions",
  component: WorkspacePermissionsRouteComponent,
});

export const projectTasksRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/$workspaceId/projects/$projectId/tasks",
  component: ProjectTasksRouteComponent,
});

export const legacyWorkspaceTasksRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/tasks",
  validateSearch: parseTasksSearch,
  component: LegacyWorkspaceTasksRouteComponent,
});

export const workspaceTagsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/tags",
  component: WorkspaceTagsRouteComponent,
});

export const workspaceTagDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/tags/$tagId",
  component: WorkspaceTagDetailRouteComponent,
});

/* ---------- approvals, invoices, goals, integrations, audit, subscription ---------- */

export const workspaceApprovalsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/approvals/$view",
  component: WorkspaceApprovalsRouteComponent,
});

export const legacyWorkspaceApprovalsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/approvals",
  component: LegacyWorkspaceApprovalsRouteComponent,
});

export const workspaceInvoicesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/invoices",
  component: WorkspaceInvoicesRouteComponent,
});

export const workspaceInvoiceNewRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/invoices/new",
  component: WorkspaceInvoiceNewRouteComponent,
});

export const workspaceGoalsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/goals",
  component: WorkspaceGoalsRouteComponent,
});

export const workspaceIntegrationsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/integrations",
  component: WorkspaceIntegrationsRouteComponent,
});

export const workspaceAuditLogRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/audit-log",
  component: WorkspaceAuditLogRouteComponent,
});

export const workspaceSubscriptionRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/subscription",
  component: WorkspaceSubscriptionRouteComponent,
});

/* ---------- route components ---------- */

function WorkspaceClientsRouteComponent() {
  return <ClientsPage />;
}

function WorkspaceClientDetailRouteComponent() {
  const params = workspaceClientDetailRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const clientId = Number(params.clientId);

  return <ClientDetailPage clientId={clientId} workspaceId={workspaceId} />;
}

function WorkspaceGroupsRouteComponent() {
  return <GroupsPage />;
}

function WorkspacePermissionsRouteComponent() {
  const params = workspacePermissionsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return <PermissionConfigPage workspaceId={workspaceId} />;
}

function ProjectTasksRouteComponent() {
  const params = projectTasksRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const projectId = Number(params.projectId);

  return <TasksPage projectId={projectId} workspaceId={workspaceId} />;
}

function LegacyWorkspaceTasksRouteComponent() {
  const params = legacyWorkspaceTasksRoute.useParams();
  const search = legacyWorkspaceTasksRoute.useSearch();

  if (typeof search.projectId === "number") {
    return (
      <Navigate
        replace
        params={{ workspaceId: params.workspaceId, projectId: String(search.projectId) }}
        to="/$workspaceId/projects/$projectId/tasks"
      />
    );
  }

  return (
    <Navigate
      replace
      params={{ workspaceId: params.workspaceId }}
      search={{ status: "default" }}
      to="/projects/$workspaceId/list"
    />
  );
}

function WorkspaceTagsRouteComponent() {
  return <TagsPage />;
}

function WorkspaceTagDetailRouteComponent() {
  const params = workspaceTagDetailRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const tagId = Number(params.tagId);

  return <TagDetailPage tagId={tagId} workspaceId={workspaceId} />;
}

function WorkspaceApprovalsRouteComponent() {
  return <ApprovalsPage />;
}

function LegacyWorkspaceApprovalsRouteComponent() {
  const params = legacyWorkspaceApprovalsRoute.useParams();

  return (
    <Navigate
      replace
      params={{ workspaceId: params.workspaceId, view: "team" }}
      to="/workspaces/$workspaceId/approvals/$view"
    />
  );
}

function WorkspaceInvoiceNewRouteComponent() {
  return <InvoiceEditorPage />;
}

function WorkspaceInvoicesRouteComponent() {
  return <InvoicesPage />;
}

function WorkspaceGoalsRouteComponent() {
  return <GoalsPage />;
}

function WorkspaceIntegrationsRouteComponent() {
  return <IntegrationsPage />;
}

function WorkspaceAuditLogRouteComponent() {
  return <AuditLogPage />;
}

function WorkspaceSubscriptionRouteComponent() {
  return <SubscriptionPage />;
}
