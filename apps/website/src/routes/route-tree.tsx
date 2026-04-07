import { Navigate, Outlet, createRoute, useRouterState } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { Suspense, lazy, useEffect, type ComponentType, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AuthenticatedAppFrame } from "../app/AuthenticatedAppFrame.tsx";
import { PublicMainPanelFrame } from "../app/PublicMainPanelFrame.tsx";
import { WebApiError } from "../shared/api/web-client.ts";
import { useSessionBootstrapQuery } from "../shared/query/web-shell.ts";
import { SessionProvider } from "../shared/session/session-context.tsx";
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
import {
  buildOrganizationSettingsPath,
  normalizeOrganizationSettingsSection,
} from "../shared/url-state/organization-settings-location.ts";
type InstanceAdminSection = "overview" | "users" | "organizations" | "config";
import { rootRoute } from "./root-route.tsx";

const pageSpinner = (
  <div className="flex min-h-screen items-center justify-center">
    <LoaderCircle className="size-8 animate-spin text-[var(--track-text-muted)]" />
  </div>
);

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
const AccountPage = lazyNamed(() => import("../pages/account/AccountPage.tsx"), "AccountPage");
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
const ProjectDashboardPage = lazyNamed(
  () => import("../pages/projects/ProjectDashboardPage.tsx"),
  "ProjectDashboardPage",
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
const AuditLogPage = lazyNamed(() => import("../pages/audit-log/AuditLogPage.tsx"), "AuditLogPage");
const SubscriptionPage = lazyNamed(
  () => import("../pages/subscription/SubscriptionPage.tsx"),
  "SubscriptionPage",
);

const MobileShell = lazyNamed(() => import("../pages/mobile/MobileShell.tsx"), "MobileShell");
const MobileTimerPage = lazyNamed(
  () => import("../pages/mobile/MobileTimerPage.tsx"),
  "MobileTimerPage",
);
const MobileCalendarPage = lazyNamed(
  () => import("../pages/mobile/MobileCalendarPage.tsx"),
  "MobileCalendarPage",
);
const MobileReportPage = lazyNamed(
  () => import("../pages/mobile/MobileReportPage.tsx"),
  "MobileReportPage",
);
const MobileMePage = lazyNamed(() => import("../pages/mobile/MobileMePage.tsx"), "MobileMePage");

/* ---------- protected layout route ---------- */
// Session guard lives here once. Child routes never re-check the session,
// so navigating between siblings never flashes a loading/login screen.

const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedLayoutComponent,
});

const homeRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
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

const accountRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/account",
  component: AccountRouteComponent,
});

const profileRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/profile",
  component: ProfileRouteComponent,
});

const workspaceOverviewRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/overview",
  component: WorkspaceOverviewRouteComponent,
});

const workspaceTimerRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/timer",
  validateSearch: parseTimerSearch,
  component: WorkspaceTimerRouteComponent,
});

const workspaceTimerStartRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/timer/start",
  validateSearch: parseTimerSearch,
  component: WorkspaceTimerRouteComponent,
});

const workspaceReportsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/reports/$tab",
  component: WorkspaceReportsRouteComponent,
});

const legacyWorkspaceReportsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/reports",
  component: LegacyWorkspaceReportsRouteComponent,
});

const workspaceProjectsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/projects/$workspaceId/list",
  validateSearch: parseProjectsSearch,
  component: WorkspaceProjectsRouteComponent,
});

const workspaceProjectDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/$workspaceId/projects/$projectId/team",
  component: WorkspaceProjectDetailRouteComponent,
});

const projectDashboardRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/$workspaceId/projects/$projectId/dashboard",
  component: ProjectDashboardRouteComponent,
});

const legacyWorkspaceProjectsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/projects",
  validateSearch: parseProjectsSearch,
  component: LegacyWorkspaceProjectsRouteComponent,
});

const legacyWorkspaceProjectDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/projects/$projectId",
  component: LegacyWorkspaceProjectDetailRouteComponent,
});

const workspaceMembersRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/members",
  component: WorkspaceMembersRouteComponent,
});

const workspaceImportRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/import",
  component: WorkspaceImportRouteComponent,
});

const legacyWorkspaceImportRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/import",
  component: LegacyWorkspaceImportRouteComponent,
});

const workspaceClientsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/clients",
  component: WorkspaceClientsRouteComponent,
});

const workspaceClientDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/clients/$clientId",
  component: WorkspaceClientDetailRouteComponent,
});

const workspaceGroupsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/groups",
  component: WorkspaceGroupsRouteComponent,
});

const workspacePermissionsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/permissions",
  component: WorkspacePermissionsRouteComponent,
});

const projectTasksRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/$workspaceId/projects/$projectId/tasks",
  component: ProjectTasksRouteComponent,
});

const legacyWorkspaceTasksRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/tasks",
  validateSearch: parseTasksSearch,
  component: LegacyWorkspaceTasksRouteComponent,
});

const workspaceTagsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/tags",
  component: WorkspaceTagsRouteComponent,
});

const workspaceTagDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/tags/$tagId",
  component: WorkspaceTagDetailRouteComponent,
});

const workspaceApprovalsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/approvals/$view",
  component: WorkspaceApprovalsRouteComponent,
});

const legacyWorkspaceApprovalsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/approvals",
  component: LegacyWorkspaceApprovalsRouteComponent,
});

const workspaceInvoicesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/invoices",
  component: WorkspaceInvoicesRouteComponent,
});

const workspaceInvoiceNewRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/invoices/new",
  component: WorkspaceInvoiceNewRouteComponent,
});

const workspaceGoalsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/goals",
  component: WorkspaceGoalsRouteComponent,
});

const workspaceIntegrationsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/integrations",
  component: WorkspaceIntegrationsRouteComponent,
});

const workspaceAuditLogRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/audit-log",
  component: WorkspaceAuditLogRouteComponent,
});

const workspaceSubscriptionRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/subscription",
  component: WorkspaceSubscriptionRouteComponent,
});

const workspaceSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/$workspaceId/settings/$section",
  component: WorkspaceSettingsRouteComponent,
});

const legacyWorkspaceSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/settings",
  validateSearch: parseLegacyWorkspaceSettingsSearch,
  component: LegacyWorkspaceSettingsRouteComponent,
});

const organizationSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/organizations/$organizationId/settings/$section",
  component: OrganizationSettingsRouteComponent,
});

const legacyOrganizationSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/organizations/$organizationId/settings",
  component: LegacyOrganizationSettingsRouteComponent,
});

const instanceAdminRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/instance-admin/$section",
  component: InstanceAdminRouteComponent,
});

const mobileLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/m",
  component: MobileLayoutRouteComponent,
});

const mobileIndexRoute = createRoute({
  getParentRoute: () => mobileLayoutRoute,
  path: "/",
  component: () => <Navigate replace to="/m/timer" />,
});

const mobileTimerRoute = createRoute({
  getParentRoute: () => mobileLayoutRoute,
  path: "/timer",
  component: MobileTimerRouteComponent,
});

const mobileCalendarRoute = createRoute({
  getParentRoute: () => mobileLayoutRoute,
  path: "/calendar",
  component: MobileCalendarRouteComponent,
});

const mobileReportRoute = createRoute({
  getParentRoute: () => mobileLayoutRoute,
  path: "/report",
  component: MobileReportRouteComponent,
});

const mobileMeRoute = createRoute({
  getParentRoute: () => mobileLayoutRoute,
  path: "/me",
  component: MobileMeRouteComponent,
});

export const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  inviteStatusJoinedRoute,
  protectedLayoutRoute.addChildren([
    homeRoute,
    accountRoute,
    profileRoute,
    workspaceOverviewRoute,
    workspaceTimerStartRoute,
    workspaceTimerRoute,
    workspaceReportsRoute,
    legacyWorkspaceReportsRoute,
    workspaceProjectsRoute,
    workspaceProjectDetailRoute,
    projectDashboardRoute,
    legacyWorkspaceProjectsRoute,
    legacyWorkspaceProjectDetailRoute,
    workspaceMembersRoute,
    workspaceImportRoute,
    legacyWorkspaceImportRoute,
    workspaceClientsRoute,
    workspaceClientDetailRoute,
    workspaceGroupsRoute,
    workspacePermissionsRoute,
    projectTasksRoute,
    legacyWorkspaceTasksRoute,
    workspaceTagsRoute,
    workspaceTagDetailRoute,
    workspaceApprovalsRoute,
    legacyWorkspaceApprovalsRoute,
    workspaceInvoiceNewRoute,
    workspaceInvoicesRoute,
    workspaceGoalsRoute,
    workspaceIntegrationsRoute,
    workspaceAuditLogRoute,
    workspaceSubscriptionRoute,
    workspaceSettingsRoute,
    legacyWorkspaceSettingsRoute,
    organizationSettingsRoute,
    legacyOrganizationSettingsRoute,
    instanceAdminRoute,
  ]),
  mobileLayoutRoute.addChildren([
    mobileIndexRoute,
    mobileTimerRoute,
    mobileCalendarRoute,
    mobileReportRoute,
    mobileMeRoute,
  ]),
]);

/* ---------- protected layout component ---------- */

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

function WorkspaceOverviewRouteComponent() {
  return <WorkspaceOverviewPage />;
}

function WorkspaceTimerRouteComponent() {
  const search = useRouterState({
    select: (state) => state.location.search as ParsedTimerSearch,
  });

  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return <Navigate replace to="/m/timer" />;
  }

  const initialDate = resolveTimerSearchDate(search.date);

  return <WorkspaceTimerPage initialDate={initialDate} startParams={search.start} />;
}

const VALID_REPORT_TABS = ["summary", "detailed", "workload", "profitability", "custom"] as const;
type ReportsTabParam = (typeof VALID_REPORT_TABS)[number];

function normalizeReportsTab(tab: string | undefined): ReportsTabParam {
  if (tab && (VALID_REPORT_TABS as readonly string[]).includes(tab)) {
    return tab as ReportsTabParam;
  }
  return "summary";
}

function WorkspaceReportsRouteComponent() {
  const params = workspaceReportsRoute.useParams();
  const tab = normalizeReportsTab(params.tab);

  return <WorkspaceReportsPage tab={tab} />;
}

function LegacyWorkspaceReportsRouteComponent() {
  const params = legacyWorkspaceReportsRoute.useParams();

  return (
    <Navigate
      replace
      params={{ workspaceId: params.workspaceId, tab: "summary" }}
      to="/workspaces/$workspaceId/reports/$tab"
    />
  );
}

function WorkspaceProjectsRouteComponent() {
  const search = workspaceProjectsRoute.useSearch();

  return <ProjectsPage statusFilter={search.status} />;
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

  return <ProjectDetailPage projectId={projectId} workspaceId={workspaceId} />;
}

function ProjectDashboardRouteComponent() {
  const params = projectDashboardRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const projectId = Number(params.projectId);

  return <ProjectDashboardPage projectId={projectId} workspaceId={workspaceId} />;
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
  return <WorkspaceMembersPage />;
}

function WorkspaceImportRouteComponent() {
  return <WorkspaceImportPage />;
}

function LegacyWorkspaceImportRouteComponent() {
  return <Navigate replace to="/import" />;
}

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

function WorkspaceSettingsRouteComponent() {
  const params = workspaceSettingsRoute.useParams();
  const workspaceId = Number(params.workspaceId);
  const section = normalizeWorkspaceSettingsSection(params.section);

  return <WorkspaceSettingsPage section={section} workspaceId={workspaceId} />;
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
  const section = normalizeOrganizationSettingsSection(params.section);

  return <OrganizationSettingsPage organizationId={organizationId} section={section} />;
}

function LegacyOrganizationSettingsRouteComponent() {
  const params = legacyOrganizationSettingsRoute.useParams();
  const organizationId = Number(params.organizationId);

  return (
    <Navigate
      replace
      to={buildOrganizationSettingsPath({
        organizationId,
        section: "general",
      })}
    />
  );
}

function InstanceAdminRouteComponent() {
  const params = instanceAdminRoute.useParams();
  const validSections: InstanceAdminSection[] = ["overview", "users", "organizations", "config"];
  const section = validSections.includes(params.section as InstanceAdminSection)
    ? (params.section as InstanceAdminSection)
    : "overview";

  const sessionQuery = useSessionBootstrapQuery();

  if (sessionQuery.data && !sessionQuery.data.user.is_instance_admin) {
    return <Navigate replace to="/" />;
  }

  return <InstanceAdminPage section={section} />;
}

/* ---------- shared UI ---------- */

function SessionPendingPanel() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--track-surface)]">
      <div className="flex flex-col items-center gap-4">
        <svg
          aria-hidden="true"
          className="size-10 animate-pulse"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect fill="#e05d26" height="32" rx="8" width="32" />
          <text
            fill="white"
            fontFamily="Arial, sans-serif"
            fontSize="20"
            fontWeight="bold"
            textAnchor="middle"
            x="16"
            y="23"
          >
            t
          </text>
        </svg>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}

function SessionUnavailablePanel() {
  const { t } = useTranslation();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    toast.error(t("toast:sessionUnavailable"), {
      description: t("account:couldNotLoadAccount"),
    });
  }, [t]);

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

function MobileLayoutRouteComponent() {
  if (typeof window !== "undefined" && window.innerWidth >= 768) {
    return <Navigate replace to="/timer" />;
  }

  return (
    <MobileProtectedBoundary>
      <Suspense fallback={pageSpinner}>
        <MobileShell />
      </Suspense>
    </MobileProtectedBoundary>
  );
}

function MobileProtectedBoundary({ children }: { children: ReactNode }) {
  const sessionQuery = useSessionBootstrapQuery();

  if (sessionQuery.isPending) {
    return <SessionPendingPanel />;
  }

  if (isSessionAccessDenied(sessionQuery.error)) {
    return <SessionExpiredRedirect />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <SessionUnavailablePanel />;
  }

  return <SessionProvider sessionBootstrap={sessionQuery.data}>{children}</SessionProvider>;
}

function MobileTimerRouteComponent() {
  return (
    <Suspense fallback={null}>
      <MobileTimerPage />
    </Suspense>
  );
}

function MobileCalendarRouteComponent() {
  return (
    <Suspense fallback={null}>
      <MobileCalendarPage />
    </Suspense>
  );
}

function MobileReportRouteComponent() {
  return (
    <Suspense fallback={null}>
      <MobileReportPage />
    </Suspense>
  );
}

function MobileMeRouteComponent() {
  return (
    <Suspense fallback={null}>
      <MobileMePage />
    </Suspense>
  );
}

function isSessionAccessDenied(error: unknown) {
  return error instanceof WebApiError && (error.status === 401 || error.status === 403);
}

function SessionExpiredRedirect() {
  const { t } = useTranslation();

  useEffect(() => {
    toast.error(t("toast:sessionExpired"), {
      description: t("auth:pleaseLogInAgain"),
    });
  }, [t]);

  return <Navigate replace to="/login" />;
}
