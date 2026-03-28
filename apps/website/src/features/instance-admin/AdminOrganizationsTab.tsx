import { AppSurfaceState, ShellSurfaceCard } from "@opentoggl/web-ui";
import type { ReactElement } from "react";

import { useOrganizationsQuery } from "../../shared/query/instance-admin.ts";

export function AdminOrganizationsTab(): ReactElement {
  const orgsQuery = useOrganizationsQuery();

  if (orgsQuery.isPending) {
    return (
      <ShellSurfaceCard>
        <AppSurfaceState className="border-none bg-transparent text-[var(--track-text-muted)]" description="Loading organizations..." title="Organizations" tone="loading" />
      </ShellSurfaceCard>
    );
  }

  if (orgsQuery.isError || !orgsQuery.data) {
    return (
      <ShellSurfaceCard>
        <AppSurfaceState className="border-none bg-transparent text-[var(--track-text-muted)]" description="Could not load organizations." title="Organizations unavailable" tone="error" />
      </ShellSurfaceCard>
    );
  }

  const orgs = orgsQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <ShellSurfaceCard>
        <div className="p-4">
          <div className="mb-3 text-[13px] text-[var(--track-text-muted)]">
            {orgs.total_count} organization{orgs.total_count !== 1 ? "s" : ""}
          </div>
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-[var(--track-border)] text-[12px] font-medium uppercase tracking-wide text-[var(--track-text-muted)]">
                <th className="pb-2 pr-4">ID</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Workspaces</th>
                <th className="pb-2">Members</th>
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
                    No organizations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </ShellSurfaceCard>
    </div>
  );
}
