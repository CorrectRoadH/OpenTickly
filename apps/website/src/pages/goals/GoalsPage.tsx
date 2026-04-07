import { type ReactElement, type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppButton,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  DirectoryTableCell,
  PageLayout,
  SelectDropdown,
} from "@opentoggl/web-ui";

import { PlusIcon } from "../../shared/ui/icons.tsx";
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

function todayISOString(): string {
  return new Date().toISOString().split("T")[0];
}

export function GoalsPage(): ReactElement {
  const { t } = useTranslation("goals");
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

  const goalColumns: DirectoryTableColumn[] = [
    { key: "name", label: t("nameColumn"), width: "minmax(200px,1.5fr)" },
    { key: "member", label: t("member"), width: "100px" },
    { key: "for", label: t("for"), width: "minmax(200px,1.5fr)" },
    { key: "progress", label: t("progress"), width: "160px" },
    { key: "streak", label: t("streak"), width: "80px" },
    { key: "endDate", label: t("endDate"), width: "120px" },
    { key: "actions", label: "", width: "42px", align: "end" },
  ];

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
      setStatusMessage(t("goalUpdated"));
    } else {
      await createGoalMutation.mutateAsync({
        name: data.name,
        comparison: data.comparison,
        recurrence: data.recurrence,
        target_seconds: data.targetHours * 3600,
        start_date: todayISOString(),
        end_date: data.noEndDate ? undefined : data.endDate || undefined,
        project_ids: data.projectIds.length > 0 ? data.projectIds : undefined,
        tag_ids: data.tagIds.length > 0 ? data.tagIds : undefined,
        billable: data.billable || undefined,
      });
      setStatusMessage(t("goalCreated"));
    }
    closeEditor();
  }

  function renderGoalRow(goal: HandlergoalsApiResponse): ReactNode {
    return (
      <>
        <DirectoryTableCell>{goal.name ?? ""}</DirectoryTableCell>
        <DirectoryTableCell>{goal.user_name ?? t("me")}</DirectoryTableCell>
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
              {formatTrackedHours(goal.current_recurrence_tracked_seconds, goal.target_seconds)}
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
        <DirectoryTableCell>{goal.end_date ?? t("noEndDate")}</DirectoryTableCell>
        <div className="flex h-[54px] items-center justify-end">
          <GoalRowActionsMenu
            goal={goal}
            onArchiveToggle={() => void handleArchiveToggle(goal)}
            onDelete={() => void handleDelete(goal)}
            onEdit={() => openEditDialog(goal)}
          />
        </div>
      </>
    );
  }

  async function handleArchiveToggle(goal: HandlergoalsApiResponse) {
    if (goal.goal_id == null) return;
    await updateGoalMutation.mutateAsync({
      goalId: goal.goal_id,
      request: { active: !goal.active },
    });
    setStatusMessage(
      goal.active ? `${t("archived")} ${goal.name}` : `${t("restored")} ${goal.name}`,
    );
  }

  async function handleDelete(goal: HandlergoalsApiResponse) {
    if (goal.goal_id == null || !window.confirm(`Delete "${goal.name}"?`)) return;
    await deleteGoalMutation.mutateAsync(goal.goal_id);
    setStatusMessage(`${t("deleted")} ${goal.name}`);
  }

  return (
    <PageLayout
      data-testid="goals-page"
      title="Goals"
      headerActions={
        <AppButton data-testid="goals-create-button" onClick={openCreateDialog} type="button">
          <PlusIcon className="size-3.5" />
          {t("newGoal")}
        </AppButton>
      }
      toolbar={
        <>
          <SelectDropdown
            aria-label="Goal status filter"
            data-testid="goals-status-filter"
            onChange={(v) => setStatusFilter(v as GoalStatusFilter)}
            options={[
              { value: "active", label: t("activeGoals") },
              { value: "archived", label: t("archivedGoals") },
            ]}
            value={statusFilter}
          />
          {statusMessage ? (
            <span className="ml-auto text-[12px] text-[var(--track-accent-text)]">
              {statusMessage}
            </span>
          ) : null}
        </>
      }
    >
      {goalsQuery.isPending ? <DirectorySurfaceMessage message={t("loadingGoals")} /> : null}
      {goalsQuery.isError ? (
        <DirectorySurfaceMessage message={t("goalsTemporarilyUnavailable")} tone="error" />
      ) : null}

      {!goalsQuery.isPending && !goalsQuery.isError ? (
        goals.length > 0 ? (
          <DirectoryTable
            columns={goalColumns}
            data-testid="goals-list"
            data-row-testid="goal-row"
            emptyState={t("noGoalsFound")}
            renderRow={renderGoalRow}
            rowKey={(goal) => goal.goal_id ?? 0}
            rows={goals}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-4 px-5 py-20 text-center"
            data-testid="goals-empty-state"
          >
            <h2 className="text-[20px] font-semibold text-white">{t("noGoalsYet")}</h2>
            <p className="max-w-[420px] text-[14px] leading-5 text-[var(--track-text-muted)]">
              {t("noGoalsDescription")}
            </p>
            <AppButton onClick={openCreateDialog} type="button">
              <PlusIcon className="size-3.5" />
              {t("newGoal")}
            </AppButton>
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
    </PageLayout>
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
