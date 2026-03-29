import { type ReactElement, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PlusIcon, SettingsIcon } from "../../shared/ui/icons.tsx";
import { TimesheetSetupDialog } from "./TimesheetSetupDialog.tsx";
import {
  getTimesheetSetups,
  getWorkspaceTimesheetsHandler,
  putWorkspaceTimesheetsBatchHandler,
} from "../../shared/api/public/track/index.ts";
import type {
  TimesheetsApiTimesheet,
  TimesheetsetupsApiTimesheetSetup,
} from "../../shared/api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { getISOWeekNumber, getWeekStart, isCurrentWeek } from "./approvals-helpers.ts";
import { FilterButton, WeekPicker } from "./ApprovalsPrimitives.tsx";

type ApprovalsView = "team" | "me" | "settings";
type TimesheetStatus = "submitted" | "approved" | "rejected" | "open";

type ApprovalsPageProps = {
  view: ApprovalsView;
};

export function ApprovalsPage({ view }: ApprovalsPageProps): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus>("submitted");
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);

  const weekNumber = useMemo(() => getISOWeekNumber(weekAnchor), [weekAnchor]);
  const weekIsCurrentWeek = useMemo(() => isCurrentWeek(weekAnchor), [weekAnchor]);

  const weekStart = useMemo(() => getWeekStart(weekAnchor), [weekAnchor]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

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

  const approvalsParams = { workspaceId: String(workspaceId) };

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="approvals-page"
    >
      {/* Header with tabs */}
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[56px] items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-4">
            <h2 className="text-[14px] font-semibold text-white">Approvals</h2>
            <nav className="flex items-center gap-1">
              <Link
                className={`rounded-[8px] px-3 py-[6px] text-[14px] font-medium ${
                  view === "team"
                    ? "text-[var(--track-accent)]"
                    : "text-[var(--track-text-muted)] hover:text-white"
                }`}
                params={{ ...approvalsParams, view: "team" }}
                to="/workspaces/$workspaceId/approvals/$view"
              >
                Team timesheets
              </Link>
              <Link
                className={`rounded-[8px] px-3 py-[6px] text-[14px] font-medium ${
                  view === "me"
                    ? "text-[var(--track-accent)]"
                    : "text-[var(--track-text-muted)] hover:text-white"
                }`}
                params={{ ...approvalsParams, view: "me" }}
                to="/workspaces/$workspaceId/approvals/$view"
              >
                Your timesheets
              </Link>
              <Link
                className={`flex items-center gap-1.5 rounded-[8px] px-3 py-[6px] text-[14px] font-medium ${
                  view === "settings"
                    ? "text-[var(--track-accent)]"
                    : "text-[var(--track-text-muted)] hover:text-white"
                }`}
                params={{ ...approvalsParams, view: "settings" }}
                to="/workspaces/$workspaceId/approvals/$view"
              >
                <SettingsIcon className="size-3.5" />
                Settings
              </Link>
            </nav>
          </div>
          {view === "settings" ? (
            <button
              className="flex h-8 items-center gap-1.5 rounded-[8px] bg-[var(--track-accent)] px-3 text-[12px] font-semibold text-white transition hover:brightness-110"
              onClick={() => setSetupDialogOpen(true)}
              type="button"
            >
              <PlusIcon className="size-3" />
              Set up timesheets for member
            </button>
          ) : null}
        </div>
      </header>

      {/* Filter bar */}
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
          {view === "team" ? <FilterButton label="Member" /> : null}
        </div>
      </div>

      {/* Status tabs (only for team and me views) */}
      {view !== "settings" ? (
        <div className="flex items-center gap-1 border-b border-[var(--track-border)] px-5 py-2">
          {(
            [
              { label: "Pending review", value: "submitted" },
              { label: "Changes requested", value: "rejected" },
              { label: "Approved", value: "approved" },
              { label: "Not submitted", value: "open" },
            ] as const
          ).map((tab) => (
            <Link
              className={`rounded-[6px] px-3 py-1.5 text-[12px] font-medium ${
                statusFilter === tab.value
                  ? "bg-[var(--track-accent-soft)] text-[var(--track-accent)]"
                  : "text-[var(--track-text-muted)] hover:text-white"
              }`}
              key={tab.value}
              onClick={(e) => {
                e.preventDefault();
                setStatusFilter(tab.value);
              }}
              to="."
            >
              {tab.label}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Setup dialog */}
      {setupDialogOpen ? <TimesheetSetupDialog onClose={() => setSetupDialogOpen(false)} /> : null}

      {/* Content */}
      {view === "settings" ? (
        <ApprovalsSettingsView
          onSetupClick={() => setSetupDialogOpen(true)}
          workspaceId={workspaceId}
        />
      ) : view === "team" ? (
        <TeamTimesheetsView
          onGoToSetup={() => {
            /* navigate to settings view — use link params */
          }}
          settingsPath={`/workspaces/${workspaceId}/approvals/settings`}
          statusFilter={statusFilter}
          weekEnd={weekEnd}
          weekStart={weekStart}
          workspaceId={workspaceId}
        />
      ) : (
        <YourTimesheetsView
          statusFilter={statusFilter}
          weekEnd={weekEnd}
          weekStart={weekStart}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}

function TeamTimesheetsView({
  onGoToSetup: _onGoToSetup,
  settingsPath: _settingsPath,
  statusFilter,
  weekEnd,
  weekStart,
  workspaceId,
}: {
  onGoToSetup: () => void;
  settingsPath: string;
  statusFilter: TimesheetStatus;
  weekEnd: Date;
  weekStart: Date;
  workspaceId: number;
}): ReactElement {
  const { durationFormat } = useUserPreferences();
  const queryClient = useQueryClient();

  const timesheetsQuery = useQuery({
    queryKey: ["timesheets", workspaceId, weekStart.toISOString(), statusFilter],
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceTimesheetsHandler({
          path: { workspace_id: workspaceId },
          query: {
            after: formatDateOnly(weekStart) as unknown as number,
            before: formatDateOnly(weekEnd) as unknown as number,
            statuses: statusFilter as unknown as number,
            per_page: 50,
          },
        }),
      ),
  });

  const updateMutation = useMutation({
    mutationFn: (params: { setup_id: number; start_date: string; status: string }) =>
      unwrapWebApiResult(
        putWorkspaceTimesheetsBatchHandler({
          path: { workspace_id: workspaceId },
          body: {
            timesheet_setup_id: params.setup_id,
            start_date: params.start_date,
            status: params.status,
          },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["timesheets", workspaceId] });
    },
  });

  const timesheets = extractTimesheets(timesheetsQuery.data);

  if (timesheetsQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-[12px] text-[var(--track-text-muted)]">
        Loading timesheets...
      </div>
    );
  }

  if (timesheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-5 py-16 text-center">
        <h3 className="text-[14px] font-semibold text-white">No timesheets to review.</h3>
        <p className="max-w-[400px] text-[12px] leading-5 text-[var(--track-text-muted)]">
          It's been a while since your team added a time entry.
        </p>
        <Link
          className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--track-border)] px-4 text-[12px] font-medium text-white hover:bg-[var(--track-row-hover)]"
          params={{ workspaceId: String(workspaceId), view: "settings" }}
          to="/workspaces/$workspaceId/approvals/$view"
        >
          Go to timesheet setup
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="border-b border-[var(--track-border)]">
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
              Member
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
              Period
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
              Tracked
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
              Status
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {timesheets.map((ts) => (
            <tr
              className="border-b border-[var(--track-border)] last:border-b-0"
              key={`${ts.timesheet_setup_id}-${ts.start_date}`}
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[11px] font-semibold text-[var(--track-accent)]">
                    {(ts.member_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white">{ts.member_name ?? "Unknown"}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-[var(--track-text-soft)]">
                {ts.start_date ?? "-"} — {ts.end_date ?? "-"}
              </td>
              <td className="px-4 py-3 tabular-nums text-white">
                {formatClockDuration(
                  ts.working_hours_in_minutes ? ts.working_hours_in_minutes * 60 : 0,
                  durationFormat,
                )}
              </td>
              <td className="px-4 py-3">
                <TimesheetStatusBadge status={ts.status ?? "open"} />
              </td>
              <td className="px-4 py-3">
                <TimesheetActions
                  isPending={updateMutation.isPending}
                  onAction={(status) =>
                    updateMutation.mutate({
                      setup_id: ts.timesheet_setup_id ?? 0,
                      start_date: ts.start_date ?? "",
                      status,
                    })
                  }
                  status={ts.status ?? "open"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YourTimesheetsView({
  statusFilter,
  weekEnd,
  weekStart,
  workspaceId,
}: {
  statusFilter: TimesheetStatus;
  weekEnd: Date;
  weekStart: Date;
  workspaceId: number;
}): ReactElement {
  const { durationFormat } = useUserPreferences();
  const queryClient = useQueryClient();

  const timesheetsQuery = useQuery({
    queryKey: ["timesheets", "me", workspaceId, weekStart.toISOString(), statusFilter],
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceTimesheetsHandler({
          path: { workspace_id: workspaceId },
          query: {
            after: formatDateOnly(weekStart) as unknown as number,
            before: formatDateOnly(weekEnd) as unknown as number,
            statuses: statusFilter as unknown as number,
            per_page: 50,
          },
        }),
      ),
  });

  const submitMutation = useMutation({
    mutationFn: (params: { setup_id: number; start_date: string }) =>
      unwrapWebApiResult(
        putWorkspaceTimesheetsBatchHandler({
          path: { workspace_id: workspaceId },
          body: {
            timesheet_setup_id: params.setup_id,
            start_date: params.start_date,
            status: "submitted",
          },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });

  const timesheets = extractTimesheets(timesheetsQuery.data);

  if (timesheetsQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-[12px] text-[var(--track-text-muted)]">
        Loading your timesheets...
      </div>
    );
  }

  if (timesheets.length === 0) {
    return (
      <EmptyTimesheets
        message="Set up timesheets and get started!"
        detail="Timesheets allow workspace admins to review, approve, and lock time entries submitted by their members. Once your first timesheet has been set up, it will appear here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="border-b border-[var(--track-border)]">
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
              Period
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
              Tracked
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
              Status
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {timesheets.map((ts) => (
            <tr
              className="border-b border-[var(--track-border)] last:border-b-0"
              key={`${ts.timesheet_setup_id}-${ts.start_date}`}
            >
              <td className="px-5 py-3 text-white">
                {ts.start_date ?? "-"} — {ts.end_date ?? "-"}
              </td>
              <td className="px-4 py-3 tabular-nums text-white">
                {formatClockDuration(
                  ts.working_hours_in_minutes ? ts.working_hours_in_minutes * 60 : 0,
                  durationFormat,
                )}
              </td>
              <td className="px-4 py-3">
                <TimesheetStatusBadge status={ts.status ?? "open"} />
              </td>
              <td className="px-4 py-3">
                {ts.status === "open" ? (
                  <button
                    className="rounded-[6px] bg-[var(--track-accent)] px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
                    disabled={submitMutation.isPending}
                    onClick={() =>
                      submitMutation.mutate({
                        setup_id: ts.timesheet_setup_id ?? 0,
                        start_date: ts.start_date ?? "",
                      })
                    }
                    type="button"
                  >
                    Submit
                  </button>
                ) : (
                  <span className="text-[12px] text-[var(--track-text-muted)]">
                    {ts.status === "submitted" ? "Awaiting review" : ts.status}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApprovalsSettingsView({
  onSetupClick,
  workspaceId,
}: {
  onSetupClick: () => void;
  workspaceId: number;
}): ReactElement {
  const setupsQuery = useQuery({
    queryKey: ["approvals", "setups", workspaceId],
    queryFn: () =>
      unwrapWebApiResult(
        getTimesheetSetups({
          path: { workspace_id: workspaceId },
        }),
      ),
  });

  const setups: TimesheetsetupsApiTimesheetSetup[] = Array.isArray(setupsQuery.data?.data)
    ? (setupsQuery.data.data as TimesheetsetupsApiTimesheetSetup[])
    : [];

  if (setupsQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-[12px] text-[var(--track-text-muted)]">
        Loading...
      </div>
    );
  }

  if (setups.length === 0) {
    return (
      <div className="flex items-center justify-center px-5 py-16" data-testid="approvals-empty">
        <div className="flex max-w-[500px] flex-col items-center rounded-[12px] border border-[var(--track-border)] px-8 py-12 text-center">
          <h2 className="text-[14px] font-semibold leading-7 text-white">
            Set up automatic timesheets for your team to collate all tracked time for easy approval
          </h2>
          <p className="mt-3 text-[12px] leading-5 text-[var(--track-text-muted)]">
            This automatic setup generates timesheets for selected team members based on tracked
            time during the week. Team members can then simply submit them for your approval.
          </p>
          <button
            className="mt-6 flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition hover:brightness-110"
            onClick={onSetupClick}
            type="button"
          >
            <PlusIcon className="size-3.5" />
            Set up timesheets for members
          </button>
        </div>
      </div>
    );
  }

  const WEEKDAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="border-b border-[var(--track-border)]">
            <th
              className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]"
              style={{ width: "25%" }}
            >
              Member ({setups.length})
            </th>
            <th
              className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]"
              style={{ width: "25%" }}
            >
              Approvers
            </th>
            <th
              className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]"
              style={{ width: "25%" }}
            >
              Period
            </th>
            <th
              className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]"
              style={{ width: "20%" }}
            >
              Reminder to submit
            </th>
            <th
              className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]"
              style={{ width: "15%" }}
            >
              Reminder type
            </th>
            <th className="w-[50px] px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {setups.map((setup) => (
            <tr className="border-b border-[var(--track-border)] last:border-b-0" key={setup.id}>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[10px] font-semibold text-[var(--track-accent)]">
                    {(setup.member_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="text-white">
                    {setup.member_name ?? `User ${setup.member_id}`}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-[var(--track-text-soft)]">
                {setup.approver_name ?? "-"}
              </td>
              <td className="px-4 py-3">
                <span className="capitalize text-white">{setup.periodicity ?? "weekly"}</span>
                {setup.start_date ? (
                  <span className="ml-1 text-[var(--track-text-muted)]">
                    starting from {setup.start_date}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-[var(--track-text-soft)]">
                {setup.reminder_day != null ? (
                  <>
                    <span>{WEEKDAY_NAMES[setup.reminder_day] ?? "-"}</span>
                    {setup.reminder_time ? (
                      <>
                        <span className="text-[var(--track-text-muted)]"> at </span>
                        <span>{setup.reminder_time}</span>
                      </>
                    ) : null}
                  </>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-3 text-[var(--track-text-soft)]">
                {[
                  setup.email_reminder_enabled ? "Email" : null,
                  setup.slack_reminder_enabled ? "Slack" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </td>
              <td className="px-2 py-3">
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[var(--track-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white"
                  title="More actions"
                  type="button"
                >
                  ⋮
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimesheetStatusBadge({ status }: { status: string }): ReactElement {
  const styles: Record<string, string> = {
    open: "bg-[var(--track-surface-muted)] text-[var(--track-text-muted)]",
    submitted: "bg-[var(--track-status-submitted)]/10 text-[var(--track-status-submitted)]",
    approved: "bg-[var(--track-status-approved)]/10 text-[var(--track-status-approved)]",
    rejected: "bg-[var(--track-status-rejected)]/10 text-[var(--track-status-rejected)]",
    reopened: "bg-[var(--track-status-submitted)]/10 text-[var(--track-status-submitted)]",
  };
  const labels: Record<string, string> = {
    open: "Not submitted",
    submitted: "Pending review",
    approved: "Approved",
    rejected: "Changes requested",
    reopened: "Reopened",
  };

  return (
    <span
      className={`inline-block rounded-[4px] px-2 py-0.5 text-[11px] font-semibold ${styles[status] ?? styles.open}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function TimesheetActions({
  isPending,
  onAction,
  status,
}: {
  isPending: boolean;
  onAction: (status: string) => void;
  status: string;
}): ReactElement {
  if (status === "submitted") {
    return (
      <div className="flex items-center gap-2">
        <button
          className="rounded-[6px] bg-[var(--track-status-approved)] px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
          disabled={isPending}
          onClick={() => onAction("approved")}
          type="button"
        >
          Approve
        </button>
        <button
          className="rounded-[6px] bg-[var(--track-status-rejected)] px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
          disabled={isPending}
          onClick={() => onAction("rejected")}
          type="button"
        >
          Reject
        </button>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <button
        className="rounded-[6px] border border-[var(--track-border)] px-3 py-1 text-[12px] text-[var(--track-text-muted)] disabled:opacity-50"
        disabled={isPending}
        onClick={() => onAction("reopened")}
        type="button"
      >
        Reopen
      </button>
    );
  }
  return <span className="text-[12px] text-[var(--track-text-muted)]">-</span>;
}

function EmptyTimesheets({ detail, message }: { detail: string; message: string }): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
      <h3 className="text-[14px] font-semibold text-white">{message}</h3>
      <p className="max-w-[400px] text-[12px] leading-5 text-[var(--track-text-muted)]">{detail}</p>
    </div>
  );
}

function extractTimesheets(data: unknown): TimesheetsApiTimesheet[] {
  if (!Array.isArray(data)) return [];
  // API returns [{data: [...]}] wrapper
  const first = data[0];
  if (first && typeof first === "object" && "data" in first && Array.isArray(first.data)) {
    return first.data as TimesheetsApiTimesheet[];
  }
  return data as TimesheetsApiTimesheet[];
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
