import { type ReactElement, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { getTimesheetSetups } from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { getWeekStart, getISOWeekNumber, isCurrentWeek } from "./approvals-helpers.ts";
import { FilterButton, WeekPicker } from "./ApprovalsPrimitives.tsx";

export function ApprovalsPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;

  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());

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

  const setupsQuery = useQuery({
    queryKey: ["approvals", "setups", workspaceId],
    queryFn: () =>
      unwrapWebApiResult(
        getTimesheetSetups({
          path: { workspace_id: workspaceId },
        }),
      ),
  });

  const hasSetups =
    !setupsQuery.isPending && !setupsQuery.isError && Array.isArray(setupsQuery.data?.data)
      ? setupsQuery.data.data.length > 0
      : false;

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="approvals-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] items-center justify-between gap-4 px-5 py-3">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-white">
            <span className="text-[var(--track-text-muted)]">Approvals</span>
            <span className="text-[var(--track-text-muted)]">/</span>
            <TrackingIcon className="size-4 text-[var(--track-text-muted)]" name="settings" />
            <span>Settings</span>
          </h2>
          <button
            className="flex h-8 items-center gap-1.5 rounded-[8px] bg-[var(--track-accent)] px-3 text-[12px] font-semibold text-white transition hover:brightness-110"
            type="button"
          >
            <TrackingIcon className="size-3" name="plus" />
            Set up timesheets for member
          </button>
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
        </div>
      </div>

      {setupsQuery.isPending ? (
        <TimesheetSetupEmpty loading />
      ) : hasSetups ? (
        <TimesheetSetupList />
      ) : (
        <TimesheetSetupEmpty />
      )}
    </div>
  );
}

function TimesheetSetupEmpty({ loading = false }: { loading?: boolean }): ReactElement {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[13px] text-[var(--track-text-muted)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-5 py-16" data-testid="approvals-empty">
      <div className="flex max-w-[500px] flex-col items-center rounded-[12px] border border-[var(--track-border)] px-8 py-12 text-center">
        <h2 className="text-[18px] font-semibold leading-7 text-white">
          Set up automatic timesheets for your team to collate all tracked time for easy approval
        </h2>
        <p className="mt-3 text-[13px] leading-5 text-[var(--track-text-muted)]">
          This automatic setup generates timesheets for selected team members based on tracked time
          during the week. Team members can then simply submit them for your approval.
        </p>
        <button
          className="mt-6 flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition hover:brightness-110"
          type="button"
        >
          <TrackingIcon className="size-3.5" name="plus" />
          Set up timesheets for members
        </button>
      </div>
    </div>
  );
}

function TimesheetSetupList(): ReactElement {
  return (
    <div className="px-5 py-4 text-[13px] text-[var(--track-text-muted)]">
      Timesheet setups are configured. The list view is not yet implemented.
    </div>
  );
}
