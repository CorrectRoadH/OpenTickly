import { AppSurfaceState, PageLayout, pageLayoutTabClass, SurfaceCard } from "@opentickly/web-ui";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { ReactElement } from "react";

import { AdminConfigTab } from "../../features/instance-admin/AdminConfigTab.tsx";
import { AdminOrganizationsTab } from "../../features/instance-admin/AdminOrganizationsTab.tsx";
import { AdminOverviewTab } from "../../features/instance-admin/AdminOverviewTab.tsx";
import { AdminUsersTab } from "../../features/instance-admin/AdminUsersTab.tsx";
import { AnimatedActiveIndicator } from "../../shared/ui/AnimatedActiveIndicator.tsx";

export type InstanceAdminSection = "overview" | "users" | "organizations" | "config";

type InstanceAdminPageProps = {
  section: InstanceAdminSection;
};

export function InstanceAdminPage({ section }: InstanceAdminPageProps): ReactElement {
  const { t } = useTranslation("instanceAdmin");

  const adminTabs: Array<{ id: InstanceAdminSection; label: string }> = [
    { id: "overview", label: t("overview") },
    { id: "users", label: t("users") },
    { id: "organizations", label: t("organizations") },
    { id: "config", label: t("config") },
  ];

  return (
    <PageLayout
      data-testid="instance-admin-page"
      title={t("instanceAdmin")}
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
        <AdminSectionContent section={section} t={t} />
      </div>
    </PageLayout>
  );
}

function AdminSectionContent({
  section,
  t,
}: {
  section: InstanceAdminSection;
  t: (key: string) => string;
}): ReactElement {
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
            description={t("sectionNotAvailable")}
            title={t("section")}
            tone="empty"
          />
        </SurfaceCard>
      );
  }
}
