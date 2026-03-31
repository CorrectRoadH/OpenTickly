import { AppSurfaceState, SurfaceCard } from "@opentoggl/web-ui";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { useOrganizationsQuery } from "../../shared/query/instance-admin.ts";

export function AdminOrganizationsTab(): ReactElement {
  const { t } = useTranslation();
  const orgsQuery = useOrganizationsQuery();

  if (orgsQuery.isPending) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description={t("instanceAdmin:loadingOrganizations")}
          title={t("instanceAdmin:organizations")}
          tone="loading"
        />
      </SurfaceCard>
    );
  }

  if (orgsQuery.isError || !orgsQuery.data) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description={t("instanceAdmin:couldNotLoadOrganizations")}
          title={t("instanceAdmin:organizationsUnavailable")}
          tone="error"
        />
      </SurfaceCard>
    );
  }

  const orgs = orgsQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <SurfaceCard>
        <div className="p-4">
          <div className="mb-3 text-[12px] text-[var(--track-text-muted)]">
            {orgs.total_count} {t("instanceAdmin:organizationsCount", { count: orgs.total_count })}
          </div>
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-[var(--track-border)] text-[12px] font-medium uppercase tracking-wide text-[var(--track-text-muted)]">
                <th className="pb-2 pr-4">{t("instanceAdmin:id")}</th>
                <th className="pb-2 pr-4">{t("instanceAdmin:name")}</th>
                <th className="pb-2 pr-4">{t("instanceAdmin:workspaces")}</th>
                <th className="pb-2">{t("instanceAdmin:members")}</th>
              </tr>
            </thead>
            <tbody>
              {orgs.organizations.map((org) => (
                <tr className="border-b border-[var(--track-border)] last:border-0" key={org.id}>
                  <td className="py-3 pr-4 text-[var(--track-text-muted)]">{org.id}</td>
                  <td className="py-3 pr-4 text-[var(--track-text)]">{org.name}</td>
                  <td className="py-3 pr-4 text-[var(--track-text)]">{org.workspace_count}</td>
                  <td className="py-3 text-[var(--track-text)]">{org.member_count}</td>
                </tr>
              ))}
              {orgs.organizations.length === 0 ? (
                <tr>
                  <td className="py-6 text-center text-[var(--track-text-muted)]" colSpan={4}>
                    {t("instanceAdmin:noOrganizationsYet")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
