import { type FormEvent, type ReactElement, useState } from "react";
import {
  AppButton,
  DirectoryFilterChip,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  DirectoryTableCell,
  PageLayout,
} from "@opentoggl/web-ui";

import { MoreIcon, PlusIcon } from "../../shared/ui/icons.tsx";
import { useCreateTaskMutation, useTasksQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { buildWorkspaceTasksPath } from "../../shared/url-state/tasks-location.ts";

type TasksPageProps = {
  projectId?: number;
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
  { key: "project", label: "Project", width: "120px" },
  { key: "status", label: "Status", width: "130px" },
  { key: "actions", label: "", width: "42px", align: "end" },
];

export function TasksPage({ projectId }: TasksPageProps): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const tasksQuery = useTasksQuery(workspaceId, projectId);
  const createTaskMutation = useCreateTaskMutation(workspaceId, projectId);
  const [taskName, setTaskName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const hasProjectScope =
    typeof projectId === "number" && Number.isInteger(projectId) && projectId > 0;
  const tasks = normalizeTasks(tasksQuery.data);
  const activeCount = tasks.filter((task) => task.active !== false).length;
  const trimmedTaskName = taskName.trim();

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasProjectScope || trimmedTaskName.length === 0) {
      return;
    }

    await createTaskMutation.mutateAsync(trimmedTaskName);
    setTaskName("");
    setComposerOpen(false);
    setStatus("Task created");
  }

  if (tasksQuery.isPending) {
    return <DirectorySurfaceMessage message="Loading tasks..." />;
  }

  if (tasksQuery.isError) {
    return (
      <DirectorySurfaceMessage message="Unable to load tasks. Refresh to try again." tone="error" />
    );
  }

  return (
    <PageLayout
      data-testid="tasks-page"
      title="Tasks"
      headerActions={
        <AppButton
          data-testid="tasks-create-button"
          disabled={!hasProjectScope}
          onClick={() => setComposerOpen((value) => !value)}
          type="button"
        >
          <PlusIcon className="size-3.5" />
          New task
        </AppButton>
      }
      toolbar={
        <>
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            <span>Filters:</span>
            <DirectoryFilterChip
              label={hasProjectScope ? `Project ${projectId}` : "Project required"}
            />
            <DirectoryFilterChip label="Task name" />
          </div>
          {status ? (
            <span className="ml-auto text-[12px] normal-case tracking-normal text-[var(--track-accent-text)]">
              {status}
            </span>
          ) : null}
        </>
      }
      composer={
        <>
          {hasProjectScope ? (
            <section
              className="border-b border-[var(--track-border)] px-5 py-3 text-[14px] text-[var(--track-text-muted)]"
              data-testid="tasks-context-bar"
            >
              Project-scoped task management for project {projectId}. Track API creates tasks
              through a project entry point, so this page is intentionally anchored to that context.
            </section>
          ) : (
            <section
              className="border-b border-[var(--track-border)] px-5 py-3 text-[14px] text-[var(--track-text-muted)]"
              data-testid="tasks-create-unavailable"
            >
              Create tasks from a project context. Open a project's task entry to add the first
              task.
            </section>
          )}

          {composerOpen && hasProjectScope ? (
            <form
              className="flex items-center gap-3 border-b border-[var(--track-border)] px-5 py-3"
              data-testid="tasks-create-form"
              onSubmit={handleCreateTask}
            >
              <label className="sr-only" htmlFor="task-name">
                Task name
              </label>
              <input
                className="h-9 w-[320px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
                id="task-name"
                onChange={(event) => setTaskName(event.target.value)}
                placeholder="Task name"
                value={taskName}
              />
              <AppButton
                disabled={trimmedTaskName.length === 0 || createTaskMutation.isPending}
                type="submit"
              >
                Save task
              </AppButton>
              <AppButton onClick={() => setComposerOpen(false)} type="button">
                Cancel
              </AppButton>
            </form>
          ) : null}
        </>
      }
      footer={
        <>
          <div
            className="border-t border-[var(--track-border)] px-5 py-3 text-[11px] text-[var(--track-text-muted)]"
            data-testid="tasks-summary"
          >
            Showing {tasks.length} tasks in workspace {workspaceId}. Active: {activeCount}.
          </div>
          {hasProjectScope ? (
            <div className="px-5 pb-5 pt-1">
              <a
                className="text-[11px] text-[var(--track-accent-text)]"
                href={buildWorkspaceTasksPath({ workspaceId })}
              >
                View all workspace tasks
              </a>
            </div>
          ) : null}
        </>
      }
    >
      <DirectoryTable<TaskListItem>
        columns={TASK_COLUMNS}
        rows={tasks}
        rowKey={(task) => task.id}
        data-testid="tasks-list"
        emptyState={
          <span data-testid="tasks-empty-state">
            {hasProjectScope
              ? "No tasks in this project yet."
              : "No tasks in this workspace yet. Open a project task entry point to create the first task."}
          </span>
        }
        renderRow={(task) => (
          <>
            <div className="flex items-center">
              <span className="size-2 rounded-full bg-[var(--track-accent)]" />
            </div>
            <DirectoryTableCell>
              <span className="truncate text-[14px] text-white">{task.name}</span>
            </DirectoryTableCell>
            <div className="flex h-[44px] items-center text-[14px] text-[var(--track-text-muted)]">
              {hasProjectScope ? `Project ${projectId}` : "Workspace catalog"}
            </div>
            <DirectoryTableCell>{task.active === false ? "Inactive" : "Active"}</DirectoryTableCell>
            <div className="flex items-center justify-end text-[var(--track-text-muted)]">
              <MoreIcon className="size-4" />
            </div>
          </>
        )}
      />
    </PageLayout>
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
