import { type ReactElement, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DirectorySurfaceMessage } from "@opentoggl/web-ui";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import type {
  TimesheetsApiTimesheet,
  TimesheetsGetPaginatedResponse,
} from "../../shared/api/generated/public-track/types.gen.ts";
import {
  getWorkspaceTimesheetsHandler,
  getMeTimesheets,
} from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import {
  type ApprovalsTab,
  type StatusFilter,
  STATUS_LABELS,
  statusFilterToApiParam,
  getWeekStart,
  getWeekEnd,
  getISOWeekNumber,
  isCurrentWeek,
  formatDateParam,
  formatPeriod,
  formatHours,
} from "./approvals-helpers.ts";
import {
  ApprovalsEmptyState,
  FilterButton,
  StatusTabButton,
  TabButton,
  WeekPicker,
} from "./ApprovalsPrimitives.tsx";

export function ApprovalsPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;

  const [activeTab, setActiveTab] = useState<ApprovalsTab>("team");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());

  const weekStart = useMemo(() => getWeekStart(weekAnchor), [weekAnchor]);
  const weekEnd = useMemo(() => getWeekEnd(weekAnchor), [weekAnchor]);
  const weekNumber = useMemo(() => getISOWeekNumber(weekAnchor), [weekAnchor]);
  const weekIsCurrentWeek = useMemo(() => isCurrentWeek(weekAnchor), [weekAnchor]);

  function goToPreviousWeek() {
    setWeekAnchor((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function goToNextWeek() {
    setWeekAnchor((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  const teamTimesheetsQuery = useQuery({
    queryKey: [
      "approvals",
      "team",
      workspaceId,
      statusFilter,
      formatDateParam(weekStart),
      formatDateParam(weekEnd),
    ],
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceTimesheetsHandler({
          path: { workspace_id: workspaceId },
          query: {
            after: formatDateParam(weekStart) as unknown as number,
            before: formatDateParam(weekEnd) as unknown as number,
            statuses: statusFilterToApiParam(statusFilter) as unknown as number,
            page: 1,
            per_page: 50,
          },
        }),
      ),
    enabled: activeTab === "team",
  });

  const myTimesheetsQuery = useQuery({
    queryKey: ["approvals", "mine"],
    queryFn: () => unwrapWebApiResult(getMeTimesheets()),
    enabled: activeTab === "yours",
  });

  /**
   * Flatten the paginated response into a flat list of timesheets.
   * The API returns Array<TimesheetsGetPaginatedResponse>, where each
   * element has a .data array of timesheets.
   */
  const teamTimesheets: TimesheetsApiTimesheet[] = useMemo(() => {
    if (!teamTimesheetsQuery.data) return [];
    const pages = teamTimesheetsQuery.data as TimesheetsGetPaginatedResponse[];
    return pages.flatMap((page) => page.data ?? []);
  }, [teamTimesheetsQuery.data]);

  const isLoading =
    activeTab === "team" ? teamTimesheetsQuery.isPending : myTimesheetsQuery.isPending;
  const isError = activeTab === "team" ? teamTimesheetsQuery.isError : myTimesheetsQuery.isError;

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="approvals-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] items-center gap-4 px-5 py-3">
          <h1 className="text-[21px] font-semibold leading-[30px] text-white">Approvals</h1>
        </div>

        <div className="flex items-center gap-0 border-t border-[var(--track-border)] px-5">
          <TabButton
            active={activeTab === "team"}
            label="Team timesheets"
            onClick={() => setActiveTab("team")}
          />
          <TabButton
            active={activeTab === "yours"}
            label="Your timesheets"
            onClick={() => setActiveTab("yours")}
          />
          <div className="ml-auto">
            <button
              aria-label="Timesheet settings"
              className="flex size-9 items-center justify-center rounded-[8px] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
              type="button"
            >
              <TrackingIcon className="size-4" name="settings" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-4 border-b border-[var(--track-border)] px-5 py-2">
        <WeekPicker
          isCurrentWeek={weekIsCurrentWeek}
          onNext={goToNextWeek}
          onPrevious={goToPreviousWeek}
          weekNumber={weekNumber}
        />
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
          <span>Filters</span>
          <FilterButton label="Approver" />
          <FilterButton label="Member" />
        </div>
      </div>

      <div className="flex items-center gap-0 border-b border-[var(--track-border)] px-5">
        {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => (
          <StatusTabButton
            active={statusFilter === key}
            key={key}
            label={STATUS_LABELS[key]}
            onClick={() => setStatusFilter(key)}
          />
        ))}
      </div>

      {isLoading ? (
        <DirectorySurfaceMessage message="Loading timesheets..." />
      ) : isError ? (
        <DirectorySurfaceMessage
          message="Unable to load timesheets. Refresh to try again."
          tone="error"
        />
      ) : activeTab === "team" ? (
        <TeamTimesheetsContent timesheets={teamTimesheets} />
      ) : (
        <YourTimesheetsContent timesheets={myTimesheetsQuery.data ?? []} />
      )}
    </div>
  );
}

function TeamTimesheetsContent({
  timesheets,
}: {
  timesheets: TimesheetsApiTimesheet[];
}): ReactElement {
  if (timesheets.length === 0) {
    return <ApprovalsEmptyState />;
  }

  return (
    <div data-testid="approvals-table">
      <div className="grid grid-cols-[42px_minmax(0,1fr)_160px_100px_minmax(0,1fr)] border-b border-[var(--track-border)] px-5 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
        <div className="flex h-[34px] items-center">
          <span className="size-[10px] rounded-[3px] border border-[var(--track-border)]" />
        </div>
        <div className="flex h-[34px] items-center">Member</div>
        <div className="flex h-[34px] items-center">Period</div>
        <div className="flex h-[34px] items-center">Hours</div>
        <div className="flex h-[34px] items-center">Pending review from</div>
      </div>

      {timesheets.map((ts, index) => (
        <div
          className="grid grid-cols-[42px_minmax(0,1fr)_160px_100px_minmax(0,1fr)] items-center border-b border-[var(--track-border)] px-5 text-[12px] transition hover:bg-[var(--track-row-hover)]"
          key={`${ts.member_id}-${ts.start_date}-${index}`}
        >
          <div className="flex h-[54px] items-center">
            <span className="size-[10px] rounded-[3px] border border-[var(--track-border)]" />
          </div>
          <div className="flex h-[54px] items-center gap-2">
            {ts.member_avatar_url ? (
              <img alt="" className="size-6 rounded-full" src={ts.member_avatar_url} />
            ) : (
              <span className="flex size-6 items-center justify-center rounded-full bg-[var(--track-surface-muted)] text-[10px] font-semibold text-[var(--track-text-muted)]">
                {(ts.member_name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-white">{ts.member_name ?? "Unknown member"}</span>
          </div>
          <div className="flex h-[54px] items-center text-[var(--track-text-muted)]">
            {formatPeriod(ts.period_start ?? ts.start_date, ts.period_end ?? ts.end_date)}
          </div>
          <div className="flex h-[54px] items-center text-white">
            {formatHours(ts.working_hours_in_minutes)}
          </div>
          <div className="flex h-[54px] items-center gap-1 text-[var(--track-text-muted)]">
            {ts.approvers?.map((approver) => (
              <span
                className="flex size-6 items-center justify-center rounded-full bg-[var(--track-surface-muted)] text-[10px] font-semibold"
                key={approver.user_id}
                title={approver.name}
              >
                {(approver.name ?? "?").charAt(0).toUpperCase()}
              </span>
            )) ?? "-"}
          </div>
        </div>
      ))}
    </div>
  );
}

function YourTimesheetsContent({ timesheets }: { timesheets: unknown[] }): ReactElement {
  if (timesheets.length === 0) {
    return (
      <div className="px-5 py-16 text-center" data-testid="approvals-empty">
        <p className="text-[14px] text-white">No timesheets found.</p>
        <p className="mt-1 text-[12px] text-[var(--track-text-muted)]">
          You don't have any timesheet submissions yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="px-5 py-4 text-[12px] text-[var(--track-text-muted)]"
      data-testid="approvals-your-list"
    >
      {timesheets.length} timesheet(s) found.
    </div>
  );
}
