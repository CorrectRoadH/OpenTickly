import { Navigate, createRoute, useRouterState } from "@tanstack/react-router";

import {
  buildProjectTeamPath,
  parseProjectsSearch,
} from "../shared/url-state/projects-location.ts";
import {
  type ParsedTimerSearch,
  parseTimerSearch,
  resolveTimerSearchDate,
} from "../shared/url-state/timer-location.ts";
import { protectedLayoutRoute } from "./route-tree-auth.tsx";
import {
  ProjectDashboardPage,
  ProjectDetailPage,
  ProjectsPage,
  WorkspaceImportPage,
  WorkspaceMembersPage,
  WorkspaceOverviewPage,
  WorkspaceReportsPage,
  WorkspaceTimerPage,
} from "./route-tree-lazy-pages.tsx";

/* ---------- tracking routes ---------- */

export const workspaceOverviewRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/overview",
  component: WorkspaceOverviewRouteComponent,
});

export const workspaceTimerRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/timer",
  validateSearch: parseTimerSearch,
  component: WorkspaceTimerRouteComponent,
});

export const workspaceTimerStartRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/timer/start",
  validateSearch: parseTimerSearch,
  component: WorkspaceTimerRouteComponent,
});

const VALID_REPORT_TABS = ["summary", "detailed", "workload", "profitability", "custom"] as const;
type ReportsTabParam = (typeof VALID_REPORT_TABS)[number];

function normalizeReportsTab(tab: string | undefined): ReportsTabParam {
  if (tab && (VALID_REPORT_TABS as readonly string[]).includes(tab)) {
    return tab as ReportsTabParam;
  }
  return "summary";
}

function parseReportsSearch(search: Record<string, unknown>): { projectId?: number } {
  const raw = search.projectId;
  if (raw != null) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return { projectId: n };
  }
  return {};
}

export const workspaceReportsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/reports/$tab",
  validateSearch: parseReportsSearch,
  component: WorkspaceReportsRouteComponent,
});

export const legacyWorkspaceReportsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/reports",
  component: LegacyWorkspaceReportsRouteComponent,
});

/* ---------- project routes ---------- */

export const workspaceProjectsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/projects/$workspaceId/list",
  validateSearch: parseProjectsSearch,
  component: WorkspaceProjectsRouteComponent,
});

export const workspaceProjectDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/$workspaceId/projects/$projectId/team",
  component: WorkspaceProjectDetailRouteComponent,
});

export const projectDashboardRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/$workspaceId/projects/$projectId/dashboard",
  component: ProjectDashboardRouteComponent,
});

export const legacyWorkspaceProjectsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/projects",
  validateSearch: parseProjectsSearch,
  component: LegacyWorkspaceProjectsRouteComponent,
});

export const legacyWorkspaceProjectDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/projects/$projectId",
  component: LegacyWorkspaceProjectDetailRouteComponent,
});

/* ---------- member & import routes ---------- */

export const workspaceMembersRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/members",
  component: WorkspaceMembersRouteComponent,
});

export const workspaceImportRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/import",
  component: WorkspaceImportRouteComponent,
});

export const legacyWorkspaceImportRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/import",
  component: LegacyWorkspaceImportRouteComponent,
});

/* ---------- route components ---------- */

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

function WorkspaceOverviewRouteComponent() {
  return <WorkspaceOverviewPage />;
}

function WorkspaceReportsRouteComponent() {
  const params = workspaceReportsRoute.useParams();
  const search = workspaceReportsRoute.useSearch();
  const tab = normalizeReportsTab(params.tab);

  return <WorkspaceReportsPage initialProjectId={search.projectId} tab={tab} />;
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
