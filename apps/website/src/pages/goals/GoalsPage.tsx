import { type ReactElement, useMemo, useState } from "react";
import {
  DirectoryHeaderCell,
  DirectorySurfaceMessage,
  DirectoryTableCell,
} from "@opentoggl/web-ui";

import { ChevronDownIcon, PlusIcon } from "../../shared/ui/icons.tsx";
import type { HandlergoalsApiResponse } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useCreateGoalMutation,
  useDeleteGoalMutation,
  useGoalsQuery,
  useUpdateGoalMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { GoalEditorDialog, type GoalFormData } from "./GoalEditorDialog.tsx";
import { GoalRowActionsMenu } from "./GoalRowActionsMenu.tsx";

type GoalStatusFilter = "active" | "archived";

function formatComparisonLabel(comparison?: string): string {
  switch (comparison) {
    case "more_than":
    case "gte":
      return "at least";
    case "less_than":
    case "lte":
      return "less than";
    default:
      return comparison ?? "";
  }
}

function formatRecurrenceLabel(recurrence?: string): string {
  switch (recurrence) {
    case "daily":
      return "every day";
    case "weekly":
      return "every week";
    case "daily_workdays":
      return "weekdays";
    default:
      return recurrence ?? "";
  }
}

function formatTargetHours(seconds?: number): string {
  if (!seconds) return "0 hours";
  const hours = seconds / 3600;
  if (hours === 1) return "1 hour";
  return `${hours} hours`;
}

function formatTrackedHours(tracked?: number, target?: number): string {
  const trackedH = Math.round(((tracked ?? 0) / 3600) * 10) / 10;
  const targetH = Math.round(((target ?? 0) / 3600) * 10) / 10;
  return `${trackedH}/${targetH} hours`;
}

function formatEndDate(goal: HandlergoalsApiResponse): string {
  if (!goal.end_date) return "No end date";
  return goal.end_date;
}

function todayISOString(): string {
  return new Date().toISOString().split("T")[0];
}

export function GoalsPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>("active");
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingGoal, setEditingGoal] = useState<HandlergoalsApiResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeFilter = statusFilter === "active" ? true : false;
  const goalsQuery = useGoalsQuery(workspaceId, activeFilter);
  const createGoalMutation = useCreateGoalMutation(workspaceId);
  const updateGoalMutation = useUpdateGoalMutation(workspaceId);
  const deleteGoalMutation = useDeleteGoalMutation(workspaceId);

  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);

  const mutationPending =
    createGoalMutation.isPending || updateGoalMutation.isPending || deleteGoalMutation.isPending;

  function openCreateDialog() {
    setEditorMode("create");
    setEditingGoal(null);
  }

  function openEditDialog(goal: HandlergoalsApiResponse) {
    setEditorMode("edit");
    setEditingGoal(goal);
  }

  function closeEditor() {
    setEditorMode(null);
    setEditingGoal(null);
  }

  async function handleSubmit(data: GoalFormData) {
    if (editorMode === "edit" && editingGoal?.goal_id != null) {
      await updateGoalMutation.mutateAsync({
        goalId: editingGoal.goal_id,
        request: {
          name: data.name,
          target_seconds: data.targetHours * 3600,
          end_date: data.noEndDate ? undefined : data.endDate || undefined,
        },
      });
      setStatusMessage("Goal updated");
    } else {
      await createGoalMutation.mutateAsync({
        name: data.name,
        comparison: data.comparison,
        recurrence: data.recurrence,
        target_seconds: data.targetHours * 3600,
        start_date: todayISOString(),
        end_date: data.noEndDate ? undefined : data.endDate || undefined,
      });
      setStatusMessage("Goal created");
    }
    closeEditor();
  }

  async function handleArchiveToggle(goal: HandlergoalsApiResponse) {
    if (goal.goal_id == null) return;
    await updateGoalMutation.mutateAsync({
      goalId: goal.goal_id,
      request: { active: !goal.active },
    });
    setStatusMessage(goal.active ? `Archived ${goal.name}` : `Restored ${goal.name}`);
  }

  async function handleDelete(goal: HandlergoalsApiResponse) {
    if (goal.goal_id == null || !window.confirm(`Delete "${goal.name}"?`)) return;
    await deleteGoalMutation.mutateAsync(goal.goal_id);
    setStatusMessage(`Deleted ${goal.name}`);
  }

  return (
    <div className="w-full min-w-0 bg-[var(--track-surface)] text-white" data-testid="goals-page">
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] items-center justify-between px-5 py-3">
          <h1 className="text-[21px] font-semibold leading-[30px] text-white">Goals</h1>
          <button
            className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white"
            data-testid="goals-create-button"
            onClick={openCreateDialog}
            type="button"
          >
            <PlusIcon className="size-3.5" />
            New goal
          </button>
        </div>
        <div className="flex min-h-[46px] items-center gap-4 border-t border-[var(--track-border)] px-5 py-2">
          <label className="relative">
            <select
              aria-label="Goal status filter"
              className="h-9 appearance-none rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 pr-8 text-[12px] text-white"
              data-testid="goals-status-filter"
              onChange={(e) => setStatusFilter(e.target.value as GoalStatusFilter)}
              value={statusFilter}
            >
              <option value="active">Active goals</option>
              <option value="archived">Archived goals</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--track-text-muted)]">
              <ChevronDownIcon className="size-3" />
            </span>
          </label>
          {statusMessage ? (
            <span className="ml-auto text-[12px] text-[var(--track-accent-text)]">
              {statusMessage}
            </span>
          ) : null}
        </div>
      </header>

      {goalsQuery.isPending ? <DirectorySurfaceMessage message="Loading goals..." /> : null}
      {goalsQuery.isError ? (
        <DirectorySurfaceMessage message="Goals are temporarily unavailable." tone="error" />
      ) : null}

      {!goalsQuery.isPending && !goalsQuery.isError ? (
        goals.length > 0 ? (
          <div data-testid="goals-list">
            <div className="grid grid-cols-[minmax(200px,1.5fr)_100px_minmax(200px,1.5fr)_160px_80px_120px_42px] border-b border-[var(--track-border)] px-5 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              <DirectoryHeaderCell>Name</DirectoryHeaderCell>
              <DirectoryHeaderCell>Member</DirectoryHeaderCell>
              <DirectoryHeaderCell>For</DirectoryHeaderCell>
              <DirectoryHeaderCell>Progress</DirectoryHeaderCell>
              <DirectoryHeaderCell>Streak</DirectoryHeaderCell>
              <DirectoryHeaderCell>End date</DirectoryHeaderCell>
              <DirectoryHeaderCell />
            </div>
            {goals.map((goal) => (
              <div
                className="grid grid-cols-[minmax(200px,1.5fr)_100px_minmax(200px,1.5fr)_160px_80px_120px_42px] items-center border-b border-[var(--track-border)] px-5 text-[13px]"
                data-testid="goal-row"
                key={goal.goal_id}
              >
                <DirectoryTableCell>{goal.name ?? ""}</DirectoryTableCell>
                <DirectoryTableCell>{goal.user_name ?? "Me"}</DirectoryTableCell>
                <DirectoryTableCell>
                  <span>
                    {formatComparisonLabel(goal.comparison)}{" "}
                    <strong>{formatTargetHours(goal.target_seconds)}</strong>{" "}
                    {formatRecurrenceLabel(goal.recurrence)}
                  </span>
                </DirectoryTableCell>
                <DirectoryTableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px]">
                      {formatTrackedHours(
                        goal.current_recurrence_tracked_seconds,
                        goal.target_seconds,
                      )}
                    </span>
                    <ProgressBar
                      current={goal.current_recurrence_tracked_seconds ?? 0}
                      target={goal.target_seconds ?? 1}
                    />
                  </div>
                </DirectoryTableCell>
                <DirectoryTableCell>
                  <span className="flex items-center gap-1">
                    {goal.streak ?? 0}
                    {(goal.streak ?? 0) > 0 ? (
                      <span className="text-[var(--track-accent)]">&#x1F525;</span>
                    ) : null}
                  </span>
                </DirectoryTableCell>
                <DirectoryTableCell>{formatEndDate(goal)}</DirectoryTableCell>
                <div className="flex h-[54px] items-center justify-end">
                  <GoalRowActionsMenu
                    goal={goal}
                    onArchiveToggle={() => void handleArchiveToggle(goal)}
                    onDelete={() => void handleDelete(goal)}
                    onEdit={() => openEditDialog(goal)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-4 px-5 py-20 text-center"
            data-testid="goals-empty-state"
          >
            <h2 className="text-[21px] font-semibold text-white">No goals yet?</h2>
            <p className="max-w-[420px] text-[14px] leading-5 text-[var(--track-text-muted)]">
              Turn your ambitions into achievements. Set your goals — it&apos;s simple and quick!
            </p>
            <button
              className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white"
              onClick={openCreateDialog}
              type="button"
            >
              <PlusIcon className="size-3.5" />
              New goal
            </button>
          </div>
        )
      ) : null}

      {editorMode ? (
        <GoalEditorDialog
          goal={editingGoal}
          isPending={mutationPending}
          onClose={closeEditor}
          onSubmit={(data) => void handleSubmit(data)}
        />
      ) : null}
    </div>
  );
}

function ProgressBar({ current, target }: { current: number; target: number }): ReactElement {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--track-border)]">
      <div
        className="h-full rounded-full bg-[var(--track-accent)] transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
