import { Navigate, createRoute, useRouterState } from "@tanstack/react-router";
import { Suspense, lazy, type ComponentType, type ReactNode } from "react";

import { AuthenticatedAppFrame } from "../app/AuthenticatedAppFrame.tsx";
import { PublicMainPanelFrame, PublicMainPanelLoading } from "../app/PublicMainPanelFrame.tsx";
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
  type ParsedTimerSearch,
  parseTimerSearch,
  resolveTimerSearchDate,
} from "../shared/url-state/timer-location.ts";
import {
  buildWorkspaceSettingsPath,
  normalizeWorkspaceSettingsSection,
  parseLegacyWorkspaceSettingsSearch,
} from "../shared/url-state/workspace-settings-location.ts";
type InstanceAdminSection = "overview" | "users" | "organizations" | "config";
import { rootRoute } from "./root-route.tsx";

function lazyNamed<T extends Record<string, ComponentType<any>>, K extends keyof T & string>(
  factory: () => Promise<T>,
  name: K,
) {
  return lazy(() => factory().then((m) => ({ default: m[name] })));
}

/* ---------- lazy page imports ---------- */

const AuthPage = lazyNamed(() => import("../pages/auth/AuthPage.tsx"), "AuthPage");
const InviteStatusJoinedPage = lazyNamed(
  () => import("../pages/members/InviteStatusJoinedPage.tsx"),
  "InviteStatusJoinedPage",
);
const ProfilePage = lazyNamed(() => import("../pages/profile/ProfilePage.tsx"), "ProfilePage");
const InstanceAdminPage = lazyNamed(
  () => import("../pages/instance-admin/InstanceAdminPage.tsx"),
  "InstanceAdminPage",
);
const OrganizationSettingsPage = lazyNamed(
  () => import("../pages/settings/OrganizationSettingsPage.tsx"),
  "OrganizationSettingsPage",
);
const WorkspaceSettingsPage = lazyNamed(
  () => import("../pages/settings/WorkspaceSettingsPage.tsx"),
  "WorkspaceSettingsPage",
);
const WorkspaceOverviewPage = lazyNamed(
  () => import("../pages/shell/WorkspaceOverviewPage.tsx"),
  "WorkspaceOverviewPage",
);
const WorkspaceReportsPage = lazyNamed(
  () => import("../pages/shell/WorkspaceReportsPage.tsx"),
  "WorkspaceReportsPage",
);
const WorkspaceTimerPage = lazyNamed(
  () => import("../pages/shell/WorkspaceTimerPage.tsx"),
  "WorkspaceTimerPage",
);
const WorkspaceMembersPage = lazyNamed(
  () => import("../pages/members/WorkspaceMembersPage.tsx"),
  "WorkspaceMembersPage",
);
const WorkspaceImportPage = lazyNamed(
  () => import("../pages/import/WorkspaceImportPage.tsx"),
  "WorkspaceImportPage",
);
const PermissionConfigPage = lazyNamed(
  () => import("../pages/permission-config/PermissionConfigPage.tsx"),
  "PermissionConfigPage",
);
const ProjectsPage = lazyNamed(() => import("../pages/projects/ProjectsPage.tsx"), "ProjectsPage");
const ProjectDetailPage = lazyNamed(
  () => import("../pages/projects/ProjectDetailPage.tsx"),
  "ProjectDetailPage",
);
const ClientsPage = lazyNamed(() => import("../pages/clients/ClientsPage.tsx"), "ClientsPage");
const ClientDetailPage = lazyNamed(
  () => import("../pages/clients/ClientDetailPage.tsx"),
  "ClientDetailPage",
);
const GroupsPage = lazyNamed(() => import("../pages/groups/GroupsPage.tsx"), "GroupsPage");
const TasksPage = lazyNamed(() => import("../pages/tasks/TasksPage.tsx"), "TasksPage");
const TagsPage = lazyNamed(() => import("../pages/tags/TagsPage.tsx"), "TagsPage");
const TagDetailPage = lazyNamed(() => import("../pages/tags/TagDetailPage.tsx"), "TagDetailPage");
const ApprovalsPage = lazyNamed(
  () => import("../pages/approvals/ApprovalsPage.tsx"),
  "ApprovalsPage",
);
const GoalsPage = lazyNamed(() => import("../pages/goals/GoalsPage.tsx"), "GoalsPage");
const IntegrationsPage = lazyNamed(
  () => import("../pages/integrations/IntegrationsPage.tsx"),
  "IntegrationsPage",
);
const InvoiceEditorPage = lazyNamed(
  () => import("../pages/invoices/InvoiceEditorPage.tsx"),
  "InvoiceEditorPage",
);
const InvoicesPage = lazyNamed(() => import("../pages/invoices/InvoicesPage.tsx"), "InvoicesPage");
const SubscriptionPage = lazyNamed(
  () => import("../pages/subscription/SubscriptionPage.tsx"),
  "SubscriptionPage",
);

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
  validateSearch: parseTimerSearch,
  component: WorkspaceTimerRouteComponent,
});

const workspaceTimerStartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/timer/start",
  validateSearch: parseTimerSearch,
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

const workspaceApprovalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/approvals",
  component: WorkspaceApprovalsRouteComponent,
});

const workspaceInvoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/invoices",
  component: WorkspaceInvoicesRouteComponent,
});

const workspaceInvoiceNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/invoices/new",
  component: WorkspaceInvoiceNewRouteComponent,
});

const workspaceGoalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/goals",
  component: WorkspaceGoalsRouteComponent,
});

const workspaceIntegrationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/integrations",
  component: WorkspaceIntegrationsRouteComponent,
});

const workspaceSubscriptionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/subscription",
  component: WorkspaceSubscriptionRouteComponent,
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

const instanceAdminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instance-admin/$section",
  component: InstanceAdminRouteComponent,
});

export const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  registerRoute,
  inviteStatusJoinedRoute,
  profileRoute,
  workspaceOverviewRoute,
  workspaceTimerStartRoute,
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
  workspaceApprovalsRoute,
  workspaceInvoiceNewRoute,
  workspaceInvoicesRoute,
  workspaceGoalsRoute,
  workspaceIntegrationsRoute,
  workspaceSubscriptionRoute,
  workspaceSettingsRoute,
  legacyWorkspaceSettingsRoute,
  organizationSettingsRoute,
  instanceAdminRoute,
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
    <Suspense fallback={<PublicMainPanelLoading />}>
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
      <Suspense fallback={<PublicMainPanelLoading />}>
        <AuthPage mode={mode} />
      </Suspense>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <Suspense fallback={<PublicMainPanelLoading />}>
        <AuthPage mode={mode} />
      </Suspense>
    );
  }

  return <Navigate replace to={resolveHomePath()} />;
}

function WorkspaceOverviewRouteComponent() {
  return renderProtectedRoute(<WorkspaceOverviewPage />);
}

function WorkspaceTimerRouteComponent() {
  const search = useRouterState({
    select: (state) => state.location.search as ParsedTimerSearch,
  });
  const initialDate = resolveTimerSearchDate(search.date);

  return renderProtectedRoute(
    <WorkspaceTimerPage initialDate={initialDate} startParams={search.start} />,
  );
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

function WorkspaceApprovalsRouteComponent() {
  const params = workspaceApprovalsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<ApprovalsPage />, workspaceId);
}

function WorkspaceInvoiceNewRouteComponent() {
  const params = workspaceInvoiceNewRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<InvoiceEditorPage />, workspaceId);
}

function WorkspaceInvoicesRouteComponent() {
  const params = workspaceInvoicesRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<InvoicesPage />, workspaceId);
}

function WorkspaceGoalsRouteComponent() {
  const params = workspaceGoalsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<GoalsPage />, workspaceId);
}

function WorkspaceIntegrationsRouteComponent() {
  const params = workspaceIntegrationsRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<IntegrationsPage />, workspaceId);
}

function WorkspaceSubscriptionRouteComponent() {
  const params = workspaceSubscriptionRoute.useParams();
  const workspaceId = Number(params.workspaceId);

  return renderProtectedRoute(<SubscriptionPage />, workspaceId);
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

function InstanceAdminRouteComponent() {
  const params = instanceAdminRoute.useParams();
  const validSections: InstanceAdminSection[] = ["overview", "users", "organizations", "config"];
  const section = validSections.includes(params.section as InstanceAdminSection)
    ? (params.section as InstanceAdminSection)
    : "overview";

  return renderProtectedRoute(<InstanceAdminPage section={section} />);
}

function renderProtectedRoute(children: ReactNode, requestedWorkspaceId?: number) {
  return (
    <ProtectedRouteBoundary requestedWorkspaceId={requestedWorkspaceId}>
      <Suspense fallback={<PublicMainPanelLoading />}>{children}</Suspense>
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
  return <PublicMainPanelLoading />;
}

function SessionUnavailablePanel() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <PublicMainPanelFrame
      badge="Session Error"
      description="The app could not restore your current session from the canonical web session endpoint."
      title="Session unavailable"
    >
      <p className="text-pretty text-[14px] leading-5 text-[var(--track-text-muted)]">
        The app could not bootstrap the current session from
        <code className="mx-1 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface)] px-2 py-1 text-[12px] text-[var(--track-text)]">
          /web/v1/session
        </code>
        while rendering {pathname}.
      </p>
    </PublicMainPanelFrame>
  );
}

function isSessionAccessDenied(error: unknown) {
  return error instanceof WebApiError && (error.status === 401 || error.status === 403);
}
