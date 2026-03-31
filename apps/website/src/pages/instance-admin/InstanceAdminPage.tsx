import { AppSurfaceState, PageLayout, pageLayoutTabClass, SurfaceCard } from "@opentoggl/web-ui";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { AdminConfigTab } from "../../features/instance-admin/AdminConfigTab.tsx";
import { AdminOrganizationsTab } from "../../features/instance-admin/AdminOrganizationsTab.tsx";
import { AdminOverviewTab } from "../../features/instance-admin/AdminOverviewTab.tsx";
import { AdminUsersTab } from "../../features/instance-admin/AdminUsersTab.tsx";
import { AnimatedActiveIndicator } from "../../shared/ui/AnimatedActiveIndicator.tsx";

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
    <PageLayout
      data-testid="instance-admin-page"
      title="Instance Admin"
      tabs={adminTabs.map((tab) => (
        <Link
          className={pageLayoutTabClass(section === tab.id)}
          key={tab.id}
          params={{ section: tab.id }}
          to="/instance-admin/$section"
        >
          {tab.label}
          {section === tab.id ? (
            <AnimatedActiveIndicator
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--track-accent)]"
              layoutId="page-layout-tab-indicator"
            />
          ) : null}
        </Link>
      ))}
    >
      <div className="px-5 pb-10 pt-5">
        <AdminSectionContent section={section} />
      </div>
    </PageLayout>
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
