import { AppPanel } from "@opentoggl/web-ui";
import { type ReactElement, type ReactNode } from "react";

import { useSession } from "../../shared/session/session-context.tsx";

export function WorkspaceOverviewPage(): ReactElement {
  const session = useSession();

  return (
    <div className="space-y-3" data-testid="time-entries-page">
      <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="time-entries-toolbar">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-white">Time entries</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-400">
                Track work from one workspace surface with shared date range, view mode, and
                running-timer context.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <ToolbarBadge label="Today" value="10:55:04" />
              <ToolbarBadge label="Week total" value="55:38:04" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterChip>All dates</FilterChip>
            <FilterChip>{session.user.fullName}</FilterChip>
            <FilterChip>{session.currentWorkspace.defaultCurrency ?? "USD"} workspace</FilterChip>
            <FilterChip>{session.currentWorkspace.role ?? "member"}</FilterChip>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-white">Continue focused work</p>
              <p className="mt-1 truncate text-sm text-slate-400">
                {session.currentOrganization?.name ?? "Personal scope"} · {session.currentWorkspace.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ViewTab active>List view</ViewTab>
              <ViewTab>Calendar</ViewTab>
              <ViewTab>Timesheet</ViewTab>
            </div>
          </div>
        </div>
      </AppPanel>

      <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="time-entries-list-panel">
        <div className="space-y-1 border-b border-white/8 pb-4 text-sm text-slate-400">
          <div className="grid grid-cols-[minmax(0,1fr)_88px_88px_110px] gap-3 px-3">
            <span>Description</span>
            <span>Start</span>
            <span>Stop</span>
            <span>Duration</span>
          </div>
        </div>
        <ul className="divide-y divide-white/8" aria-label="Time entries list" data-testid="time-entries-list">
          {TRACKING_ROWS.map((row) => (
            <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_88px_88px_110px] gap-3 px-3 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{row.title}</p>
                <p className="mt-1 truncate text-sm text-slate-400">{row.meta}</p>
              </div>
              <span className="text-sm tabular-nums text-slate-300">{row.start}</span>
              <span className="text-sm tabular-nums text-slate-300">{row.stop}</span>
              <span className="text-sm font-semibold tabular-nums text-slate-100">{row.duration}</span>
            </li>
          ))}
        </ul>
      </AppPanel>
    </div>
  );
}

const TRACKING_ROWS = [
  {
    id: "draft-prd",
    title: "Drafted project shell redesign",
    meta: "OpenToggl redesign · product alignment",
    start: "10:35",
    stop: "11:08",
    duration: "00:32:29",
  },
  {
    id: "review-ui",
    title: "Reviewed Toggl screenshot hierarchy",
    meta: "Track surface · screenshot comparison",
    start: "11:23",
    stop: "11:49",
    duration: "00:26:47",
  },
  {
    id: "sync-docs",
    title: "Mapped docs to current routes",
    meta: "OpenToggl docs · routing audit",
    start: "12:31",
    stop: "13:24",
    duration: "00:53:11",
  },
  {
    id: "implement-shell",
    title: "Implemented screenshot-aligned shell",
    meta: "Workspace shell · dark application chrome",
    start: "13:24",
    stop: "14:22",
    duration: "00:58:22",
  },
];

function ToolbarBadge({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-lg border border-white/8 bg-white/4 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function FilterChip({ children }: { children: ReactNode }): ReactElement {
  return (
    <span className="rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-slate-200">
      {children}
    </span>
  );
}

function ViewTab({
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
