import { AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

export function WorkspaceReportsPage(): ReactElement {
  return (
    <AppPanel className="bg-white/95">
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Reports</h1>
          <p className="text-sm leading-6 text-slate-600">
            Review workspace-level reporting status, visibility, and export readiness.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ReportStatus title="Saved views" value="Ready" />
          <ReportStatus title="Sharing links" value="Workspace scoped" />
          <ReportStatus title="Exports" value="Configured" />
        </div>
      </div>
    </AppPanel>
  );
}

function ReportStatus({ title, value }: { title: string; value: string }): ReactElement {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
