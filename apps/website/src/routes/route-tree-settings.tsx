import { Navigate, createRoute } from "@tanstack/react-router";

import { useSessionBootstrapQuery } from "../shared/query/web-shell.ts";
import {
  buildWorkspaceSettingsPath,
  normalizeWorkspaceSettingsSection,
  parseLegacyWorkspaceSettingsSearch,
} from "../shared/url-state/workspace-settings-location.ts";
import {
  buildOrganizationSettingsPath,
  normalizeOrganizationSettingsSection,
} from "../shared/url-state/organization-settings-location.ts";
import { protectedLayoutRoute } from "./route-tree-auth.tsx";
import {
  InstanceAdminPage,
  OrganizationSettingsPage,
  WorkspaceSettingsPage,
} from "./route-tree-lazy-pages.tsx";

type InstanceAdminSection = "overview" | "users" | "organizations" | "config";

/* ---------- workspace settings ---------- */

export const workspaceSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/$workspaceId/settings/$section",
  component: WorkspaceSettingsRouteComponent,
});

export const legacyWorkspaceSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/workspaces/$workspaceId/settings",
  validateSearch: parseLegacyWorkspaceSettingsSearch,
  component: LegacyWorkspaceSettingsRouteComponent,
});

/* ---------- organization settings ---------- */

export const organizationSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/organizations/$organizationId/settings/$section",
  component: OrganizationSettingsRouteComponent,
});

export const legacyOrganizationSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/organizations/$organizationId/settings",
  component: LegacyOrganizationSettingsRouteComponent,
});

/* ---------- instance admin ---------- */

export const instanceAdminRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/instance-admin/$section",
  component: InstanceAdminRouteComponent,
});

/* ---------- route components ---------- */

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
