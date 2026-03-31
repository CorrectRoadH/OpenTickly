import type { SessionBootstrapViewModel } from "../../entities/session/session-bootstrap.ts";
import {
  buildOverviewPath,
  buildProjectsPath,
  buildWorkspaceReportsPath,
  buildWorkspaceSettingsPathWithSection,
  buildTimerPath,
} from "./workspace-routing.ts";

export type ShellNavigationSection = {
  items: Array<{
    badge?: string;
    disabled?: boolean;
    id: string;
    label: string;
    to?: string;
  }>;
  title: string;
};

export function shellNavigationItems(
  session: SessionBootstrapViewModel,
  t: (key: string) => string,
): ShellNavigationSection[] {
  return [
    {
      title: t("navigation:track"),
      items: [
        {
          id: "overview",
          label: t("navigation:overview"),
          to: buildOverviewPath(),
        },
        {
          id: "timer",
          label: t("navigation:timer"),
          to: buildTimerPath(),
        },
      ],
    },
    {
      title: t("navigation:analyze"),
      items: [
        {
          id: "reports",
          label: t("navigation:reports"),
          to: buildWorkspaceReportsPath(session.currentWorkspace.id),
        },
        {
          id: "approvals",
          label: t("navigation:approvals"),
          to: `/workspaces/${session.currentWorkspace.id}/approvals/team`,
        },
      ],
    },
    {
      title: t("navigation:manage"),
      items: [
        {
          id: "projects",
          label: t("navigation:projects"),
          to: buildProjectsPath(session.currentWorkspace.id),
        },
        {
          id: "clients",
          label: t("navigation:clients"),
          to: `/workspaces/${session.currentWorkspace.id}/clients`,
        },
        {
          id: "members",
          label: t("navigation:members"),
          to: `/workspaces/${session.currentWorkspace.id}/members`,
        },
        {
          id: "billableRates",
          label: t("navigation:billableRates"),
          to: buildWorkspaceSettingsPathWithSection(session.currentWorkspace.id, "billable-rates"),
        },
        {
          id: "invoices",
          label: t("navigation:invoices"),
          to: `/workspaces/${session.currentWorkspace.id}/invoices`,
        },
        {
          id: "tags",
          label: t("navigation:tags"),
          to: `/workspaces/${session.currentWorkspace.id}/tags`,
        },
        {
          id: "goals",
          label: t("navigation:goals"),
          to: `/workspaces/${session.currentWorkspace.id}/goals`,
        },
        // Import: primary entry point for Toggl data migration — do not remove
        {
          id: "import",
          label: t("navigation:import"),
          to: `/workspaces/${session.currentWorkspace.id}/import`,
        },
        {
          id: "integrations",
          label: t("navigation:integrations"),
          to: `/workspaces/${session.currentWorkspace.id}/integrations`,
        },
      ],
    },
    {
      title: t("navigation:admin"),
      items: [
        {
          id: "auditLog",
          label: t("navigation:auditLog"),
          to: `/workspaces/${session.currentWorkspace.id}/audit-log`,
        },
        {
          id: "subscription",
          label: t("navigation:subscription"),
          to: `/workspaces/${session.currentWorkspace.id}/subscription`,
        },
        {
          id: "settings",
          label: t("navigation:settings"),
          to: buildWorkspaceSettingsPathWithSection(session.currentWorkspace.id),
        },
        {
          id: "instanceAdmin",
          label: t("navigation:instanceAdmin"),
          to: "/instance-admin/overview",
        },
      ],
    },
  ];
}
