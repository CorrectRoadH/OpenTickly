import { AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

export function WorkspaceReportsPage(): ReactElement {
  return (
    <div className="space-y-3">
      <AppPanel className="border-white/8 bg-[#1f1f23]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-white">Reports</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Summary reporting stays in its own product surface with filters, saved views, and
                export actions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TopTab active>Summary</TopTab>
              <TopTab>Detailed</TopTab>
              <TopTab>Workload</TopTab>
              <TopTab>Profitability</TopTab>
              <TopTab>My reports</TopTab>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterChip>This week</FilterChip>
            <FilterChip>Member</FilterChip>
            <FilterChip>Client</FilterChip>
            <FilterChip>Project</FilterChip>
            <FilterChip>Tag</FilterChip>
            <FilterChip>Description</FilterChip>
          </div>
        </div>
      </AppPanel>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        <AppPanel className="border-white/8 bg-[#1f1f23]">
          <div className="grid gap-3 sm:grid-cols-3">
            <ReportStatus title="Total hours" value="53:49:15" />
            <ReportStatus title="Billable hours" value="-" />
            <ReportStatus title="Average daily" value="13.46 h" />
          </div>
          <div className="mt-4 h-72 rounded-xl border border-white/8 bg-[#18181c] p-4">
            <p className="text-sm font-semibold text-white">Duration by day</p>
            <div className="mt-6 flex h-52 items-end gap-5">
              {["15:32", "13:23", "15:46", "9:06", "0:00", "0:00", "0:00"].map((value, index) => (
                <div key={value} className="flex flex-1 flex-col items-center gap-3">
                  <span className="text-xs tabular-nums text-slate-500">{value}</span>
                  <div
                    className="w-full rounded-t-md bg-[#9b59a7]"
                    style={{ height: `${[82, 71, 84, 49, 4, 4, 4][index]}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </AppPanel>

        <AppPanel className="border-white/8 bg-[#1f1f23]">
          <p className="text-sm font-semibold text-white">Project distribution</p>
          <div className="mt-6 flex items-center justify-center">
            <div className="flex size-52 items-center justify-center rounded-full border-[28px] border-[#c05890] border-r-[#d34d3a] border-b-[#d8c33d] border-l-[#4f8adf]">
              <div className="text-center">
                <p className="text-2xl font-semibold tabular-nums text-white">53:49:15</p>
                <p className="mt-2 text-xs text-slate-500">PROJECT</p>
              </div>
            </div>
          </div>
        </AppPanel>
      </div>
    </div>
  );
}

function ReportStatus({ title, value }: { title: string; value: string }): ReactElement {
  return (
    <div className="rounded-xl border border-white/8 bg-[#18181c] p-4">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function TopTab({
  active = false,
  children,
}: {
  active?: boolean;
  children: string;
}): ReactElement {
  return (
    <button
      className={`rounded-lg border px-3 py-2 text-sm font-medium ${
        active
          ? "border-[#8c5495] bg-[#4d2c52] text-white"
          : "border-white/10 bg-transparent text-slate-300"
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

function FilterChip({ children }: { children: string }): ReactElement {
  return (
    <span className="rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-slate-200">
      {children}
    </span>
  );
}
