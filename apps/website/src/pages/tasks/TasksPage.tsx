import { type FormEvent, type ReactElement, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { useCreateTaskMutation, useTasksQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { buildWorkspaceTasksPath } from "../../shared/url-state/tasks-location.ts";

type TasksPageProps = {
  projectId?: number;
};

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
    return <SurfaceMessage message="Loading tasks..." />;
  }

  if (tasksQuery.isError) {
    return <SurfaceMessage message="Unable to load tasks. Refresh to try again." tone="error" />;
  }

  return (
    <div className="w-full min-w-0 bg-[var(--track-surface)] text-white" data-testid="tasks-page">
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <h1 className="text-[21px] font-medium text-white">Tasks</h1>
          <button
            className="flex h-[28px] items-center gap-1 rounded-md bg-[var(--track-button)] px-3 text-[11px] font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="tasks-create-button"
            disabled={!hasProjectScope}
            onClick={() => setComposerOpen((value) => !value)}
            type="button"
          >
            <TrackingIcon className="size-3.5" name="plus" />
            New task
          </button>
        </div>
        <div className="flex min-h-[46px] flex-wrap items-center gap-4 border-t border-[var(--track-border)] px-5 py-2 text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
          <span>Filters:</span>
          <FilterChip label={hasProjectScope ? `Project ${projectId}` : "Project required"} />
          <FilterChip label="Task name" />
          {status ? (
            <span className="ml-auto text-[11px] normal-case tracking-normal text-[var(--track-accent-text)]">
              {status}
            </span>
          ) : null}
        </div>
      </header>

      {hasProjectScope ? (
        <section
          className="border-b border-[var(--track-border)] px-5 py-3 text-[12px] text-[var(--track-text-muted)]"
          data-testid="tasks-context-bar"
        >
          Project-scoped task management for project {projectId}. Track API creates tasks through a
          project entry point, so this page is intentionally anchored to that context.
        </section>
      ) : (
        <section
          className="border-b border-[var(--track-border)] px-5 py-3 text-[12px] text-[var(--track-text-muted)]"
          data-testid="tasks-create-unavailable"
        >
          Create tasks from a project context. Open a project's task entry to add the first task.
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
            className="h-9 w-[320px] rounded-md border border-[var(--track-border)] bg-[#181818] px-3 text-[13px] text-white outline-none focus:border-[var(--track-accent-soft)]"
            id="task-name"
            onChange={(event) => setTaskName(event.target.value)}
            placeholder="Task name"
            value={taskName}
          />
          <button
            className="flex h-9 items-center rounded-md bg-[var(--track-button)] px-4 text-[12px] font-medium text-black disabled:opacity-60"
            disabled={trimmedTaskName.length === 0 || createTaskMutation.isPending}
            type="submit"
          >
            Save task
          </button>
          <button
            className="flex h-9 items-center rounded-md border border-[var(--track-border)] px-4 text-[12px] text-[var(--track-text-muted)]"
            onClick={() => setComposerOpen(false)}
            type="button"
          >
            Cancel
          </button>
        </form>
      ) : null}

      {tasks.length > 0 ? (
        <div data-testid="tasks-list">
          <div className="grid grid-cols-[42px_minmax(0,1fr)_120px_130px_42px] border-b border-[var(--track-border)] px-5 text-[9px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            <div className="flex h-[34px] items-center">
              <span className="size-[10px] rounded-[3px] border border-[var(--track-border)]" />
            </div>
            <div className="flex h-[34px] items-center">Task</div>
            <div className="flex h-[34px] items-center">Project</div>
            <div className="flex h-[34px] items-center">Status</div>
            <div className="flex h-[34px] items-center justify-end" />
          </div>
          {tasks.map((task) => (
            <div
              className="grid grid-cols-[42px_minmax(0,1fr)_120px_130px_42px] items-center border-b border-[var(--track-border)] px-5 text-[12px]"
              key={task.id}
            >
              <div className="flex h-[54px] items-center">
                <span className="size-2 rounded-full bg-[#00b8ff]" />
              </div>
              <div className="flex h-[54px] items-center overflow-hidden">
                <span className="truncate text-white">{task.name}</span>
              </div>
              <div className="flex h-[54px] items-center text-[var(--track-text-muted)]">
                {hasProjectScope ? `Project ${projectId}` : "Workspace catalog"}
              </div>
              <div className="flex h-[54px] items-center text-white">
                {task.active === false ? "Inactive" : "Active"}
              </div>
              <div className="flex h-[54px] items-center justify-end text-[var(--track-text-muted)]">
                <TrackingIcon className="size-4" name="more" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="px-5 py-10 text-sm text-[var(--track-text-muted)]"
          data-testid="tasks-empty-state"
        >
          {hasProjectScope
            ? "No tasks in this project yet."
            : "No tasks in this workspace yet. Open a project task entry point to create the first task."}
        </div>
      )}

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
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="flex h-[26px] items-center rounded-md border border-[var(--track-border)] px-2.5 text-[11px] normal-case tracking-normal text-white">
      {label}
    </span>
  );
}

function SurfaceMessage({
  message,
  tone = "muted",
}: {
  message: string;
  tone?: "error" | "muted";
}) {
  return (
    <div
      className={`px-5 py-8 text-sm ${
        tone === "error" ? "text-rose-300" : "text-[var(--track-text-muted)]"
      }`}
    >
      {message}
    </div>
  );
}

type TaskListItem = {
  active?: boolean | null;
  id: number;
  name: string;
  workspace_id?: number | null;
};

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
