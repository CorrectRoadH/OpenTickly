import { AppSurfaceState, PageHeader, SurfaceCard } from "@opentoggl/web-ui";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { AdminConfigTab } from "../../features/instance-admin/AdminConfigTab.tsx";
import { AdminOrganizationsTab } from "../../features/instance-admin/AdminOrganizationsTab.tsx";
import { AdminOverviewTab } from "../../features/instance-admin/AdminOverviewTab.tsx";
import { AdminUsersTab } from "../../features/instance-admin/AdminUsersTab.tsx";

export type InstanceAdminSection = "overview" | "users" | "organizations" | "config";

const adminTabs: Array<{ id: InstanceAdminSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "organizations", label: "Organizations" },
  { id: "config", label: "Config" },
];

type InstanceAdminPageProps = {
  section: InstanceAdminSection;
};

export function InstanceAdminPage({ section }: InstanceAdminPageProps): ReactElement {
  return (
    <div className="min-h-full bg-[var(--track-surface)]" data-testid="instance-admin-page">
      <div className="max-w-[1384px]">
        <AdminHeader activeSection={section} />
        <div className="px-5 pb-10 pt-5">
          <AdminSectionContent section={section} />
        </div>
      </div>
    </div>
  );
}

function AdminHeader({ activeSection }: { activeSection: InstanceAdminSection }): ReactElement {
  return (
    <header className="bg-[var(--track-surface)]">
      <PageHeader bordered title="Instance Admin" />
      <nav className="flex flex-wrap items-center gap-1 px-5 pb-3">
        {adminTabs.map((tab) => (
          <Link
            className={`rounded-[8px] px-3 py-[6px] text-[14px] font-semibold leading-5 ${
              activeSection === tab.id
                ? "text-[var(--track-accent)]"
                : "text-[var(--track-text-soft)] hover:text-white"
            }`}
            key={tab.id}
            params={{ section: tab.id }}
            to="/instance-admin/$section"
          >
            <span
              className={`border-b-2 pb-[2px] ${
                activeSection === tab.id ? "border-[var(--track-accent)]" : "border-transparent"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        ))}
      </nav>
    </header>
  );
}

function AdminSectionContent({ section }: { section: InstanceAdminSection }): ReactElement {
  switch (section) {
    case "overview":
      return <AdminOverviewTab />;
    case "users":
      return <AdminUsersTab />;
    case "organizations":
      return <AdminOrganizationsTab />;
    case "config":
      return <AdminConfigTab />;
    default:
      return (
        <SurfaceCard>
          <AppSurfaceState
            className="border-none bg-transparent text-[var(--track-text-muted)]"
            description="This section is not available."
            title="Section"
            tone="empty"
          />
        </SurfaceCard>
      );
  }
}
