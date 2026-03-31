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
          label: t("navigation:overview"),
          to: buildOverviewPath(),
        },
        {
          label: t("navigation:timer"),
          to: buildTimerPath(),
        },
      ],
    },
    {
      title: t("navigation:analyze"),
      items: [
        {
          label: t("navigation:reports"),
          to: buildWorkspaceReportsPath(session.currentWorkspace.id),
        },
        {
          label: t("navigation:approvals"),
          to: `/workspaces/${session.currentWorkspace.id}/approvals/team`,
        },
      ],
    },
    {
      title: t("navigation:manage"),
      items: [
        {
          label: t("navigation:projects"),
          to: buildProjectsPath(session.currentWorkspace.id),
        },
        {
          label: t("navigation:clients"),
          to: `/workspaces/${session.currentWorkspace.id}/clients`,
        },
        {
          label: t("navigation:members"),
          to: `/workspaces/${session.currentWorkspace.id}/members`,
        },
        {
          label: t("navigation:billableRates"),
          to: buildWorkspaceSettingsPathWithSection(session.currentWorkspace.id, "billable-rates"),
        },
        {
          label: t("navigation:invoices"),
          to: `/workspaces/${session.currentWorkspace.id}/invoices`,
        },
        {
          label: t("navigation:tags"),
          to: `/workspaces/${session.currentWorkspace.id}/tags`,
        },
        {
          label: t("navigation:goals"),
          to: `/workspaces/${session.currentWorkspace.id}/goals`,
        },
        // Import: primary entry point for Toggl data migration — do not remove
        {
          label: t("navigation:import"),
          to: `/workspaces/${session.currentWorkspace.id}/import`,
        },
        {
          label: t("navigation:integrations"),
          to: `/workspaces/${session.currentWorkspace.id}/integrations`,
        },
      ],
    },
    {
      title: t("navigation:admin"),
      items: [
        {
          label: t("navigation:auditLog"),
          to: `/workspaces/${session.currentWorkspace.id}/audit-log`,
        },
        {
          label: t("navigation:subscription"),
          to: `/workspaces/${session.currentWorkspace.id}/subscription`,
        },
        {
          label: t("navigation:settings"),
          to: buildWorkspaceSettingsPathWithSection(session.currentWorkspace.id),
        },
        {
          label: t("navigation:instanceAdmin"),
          to: "/instance-admin/overview",
        },
      ],
    },
  ];
}
