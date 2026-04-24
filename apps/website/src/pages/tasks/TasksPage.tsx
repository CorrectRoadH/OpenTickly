import { type FormEvent, type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppButton,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  DirectoryTableCell,
  DirectoryTableRenderCountBadge,
} from "@opentickly/web-ui";

import { MoreIcon, PlusIcon } from "../../shared/ui/icons.tsx";
import { useCreateTaskMutation, useTasksQuery } from "../../shared/query/web-shell.ts";
import { ProjectDetailLayout } from "../projects/ProjectDetailLayout.tsx";

type TasksPageProps = {
  projectId: number;
  workspaceId: number;
};

type TaskListItem = {
  active?: boolean | null;
  id: number;
  name: string;
  workspace_id?: number | null;
};

const TASK_COLUMNS: DirectoryTableColumn[] = [
  { key: "dot", label: "", width: "42px" },
  { key: "name", label: "Task", width: "minmax(0,1fr)" },
  { key: "status", label: "Status", width: "130px" },
  { key: "actions", label: "", width: "42px", align: "end" },
];

export function TasksPage({ projectId, workspaceId }: TasksPageProps): ReactElement {
  const { t } = useTranslation("tasks");
  const tasksQuery = useTasksQuery(workspaceId, projectId);
  const createTaskMutation = useCreateTaskMutation(workspaceId, projectId);
  const [taskName, setTaskName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const tasks = normalizeTasks(tasksQuery.data);
  const activeCount = tasks.filter((task) => task.active !== false).length;
  const trimmedTaskName = taskName.trim();

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmedTaskName.length === 0) {
      return;
    }

    await createTaskMutation.mutateAsync(trimmedTaskName);
    setTaskName("");
    setComposerOpen(false);
    setStatus(t("taskCreated"));
  }

  return (
    <ProjectDetailLayout activeTab="tasks" projectId={projectId} workspaceId={workspaceId}>
      {tasksQuery.isPending ? <DirectorySurfaceMessage message={t("loadingTasks")} /> : null}
      {tasksQuery.isError ? (
        <DirectorySurfaceMessage message={t("unableToLoadTasks")} tone="error" />
      ) : null}
      {!tasksQuery.isPending && !tasksQuery.isError ? (
        <section className="pt-3">
          <div className="flex items-center justify-between py-3">
            <span className="text-[12px] text-[var(--track-text-muted)]">
              {tasks.length} tasks · {activeCount} active
            </span>
            <AppButton
              data-testid="tasks-create-button"
              onClick={() => setComposerOpen((value) => !value)}
              type="button"
            >
              <PlusIcon className="size-3.5" />
              {t("newTask")}
            </AppButton>
          </div>

          {status ? (
            <div className="pb-2 text-[12px] text-[var(--track-accent-text)]">{status}</div>
          ) : null}

          {composerOpen ? (
            <form
              className="flex items-center gap-3 border-b border-[var(--track-border)] pb-3"
              data-testid="tasks-create-form"
              onSubmit={handleCreateTask}
            >
              <label className="sr-only" htmlFor="task-name">
                {t("taskName")}
              </label>
              <input
                className="h-9 w-[320px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
                id="task-name"
                onChange={(event) => setTaskName(event.target.value)}
                placeholder={t("taskName")}
                value={taskName}
              />
              <AppButton
                disabled={trimmedTaskName.length === 0 || createTaskMutation.isPending}
                type="submit"
              >
                {t("saveTask")}
              </AppButton>
              <AppButton onClick={() => setComposerOpen(false)} type="button">
                {t("cancel")}
              </AppButton>
            </form>
          ) : null}

          <DirectoryTable<TaskListItem>
            columns={TASK_COLUMNS}
            rows={tasks}
            rowKey={(task) => task.id}
            data-testid="tasks-list"
            emptyIcon={<PlusIcon className="size-5" />}
            emptyTitle={t("noTasksInProject")}
            emptyDescription={t("createFirstTaskHint")}
            renderRow={(task) => (
              <>
                <div className="flex items-center">
                  <span className="size-2 rounded-full bg-[var(--track-accent)]" />
                </div>
                <DirectoryTableCell>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[14px] text-white">{task.name}</span>
                    <DirectoryTableRenderCountBadge />
                  </span>
                </DirectoryTableCell>
                <DirectoryTableCell>{task.active === false ? "Done" : "Active"}</DirectoryTableCell>
                <div className="flex items-center justify-end text-[var(--track-text-muted)]">
                  <MoreIcon className="size-4" />
                </div>
              </>
            )}
          />
        </section>
      ) : null}
    </ProjectDetailLayout>
  );
}

function normalizeTasks(data: unknown): TaskListItem[] {
  if (Array.isArray(data)) {
    return data as TaskListItem[];
  }

  if (hasTaskArray(data, "tasks")) {
    return data.tasks;
  }

  if (hasTaskArray(data, "data")) {
    return data.data;
  }

  return [];
}

function hasTaskArray(
  value: unknown,
  key: "data" | "tasks",
): value is Record<typeof key, TaskListItem[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}
