import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type FormEvent, type ReactElement, useRef, useState } from "react";

import { useCreateTaskMutation, useTasksQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { buildWorkspaceTasksPath } from "../../shared/url-state/tasks-location.ts";

type TasksPageProps = {
  projectId?: number;
};

export function TasksPage({ projectId }: TasksPageProps): ReactElement {
  const session = useSession();
  const tasksQuery = useTasksQuery(session.currentWorkspace.id, projectId);
  const createTaskMutation = useCreateTaskMutation(session.currentWorkspace.id, projectId);
  const [taskName, setTaskName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const taskNameInputRef = useRef<HTMLInputElement | null>(null);
  const hasProjectScope = typeof projectId === "number" && Number.isInteger(projectId) && projectId > 0;
  const tasks = normalizeTasks(tasksQuery.data);
  const activeCount = tasks.filter((task) => task.active !== false).length;
  const trimmedTaskName = taskName.trim();

  if (tasksQuery.isPending) {
    return (
      <AppPanel className="border-white/8 bg-[#1f1f23]">
        <p className="text-sm text-slate-400">Loading tasks…</p>
      </AppPanel>
    );
  }

  if (tasksQuery.isError) {
    return (
      <AppPanel className="border-rose-500/30 bg-[#23181b]">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Tasks</h1>
          <p className="text-sm leading-6 text-rose-300">
            Unable to load tasks. Refresh to try again.
          </p>
        </div>
      </AppPanel>
    );
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasProjectScope || trimmedTaskName.length === 0) {
      return;
    }

    await createTaskMutation.mutateAsync(trimmedTaskName);
    setTaskName("");
    setStatus("Task created");
  }

  return (
    <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="tasks-page">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Tasks</h1>
          <p className="text-sm text-slate-500">Task directory</p>
          <p className="text-sm leading-6 text-slate-400">
            Keep project-scoped work breakdown, task availability, and quick creation visible from
            the shared tracking catalog.
          </p>
        </div>
        {hasProjectScope ? (
          <AppButton onClick={() => taskNameInputRef.current?.focus()} type="button">
            Create task
          </AppButton>
        ) : null}
      </div>

      {hasProjectScope ? (
        <section
          className="mt-6 rounded-xl border border-white/10 bg-[#18181c] p-4"
          data-testid="tasks-context-bar"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Project task management entry
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Opened from project {projectId}. Use this page as the task management entry point
            for that project context.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/8"
              href={`/workspaces/${session.currentWorkspace.id}/projects/${projectId}`}
            >
              Project details
            </a>
            <a
              className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/8"
              href={buildWorkspaceTasksPath({
                workspaceId: session.currentWorkspace.id,
              })}
            >
              All workspace tasks
            </a>
          </div>
        </section>
      ) : null}

      {hasProjectScope ? (
        <form className="mt-6 flex flex-wrap items-end gap-3" data-testid="tasks-create-form" onSubmit={handleCreateTask}>
          <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-300">
            Task name
            <input
              ref={taskNameInputRef}
              className="rounded-xl border border-white/10 bg-[#18181c] px-4 py-3 text-white"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
            />
          </label>
          <AppButton disabled={trimmedTaskName.length === 0 || createTaskMutation.isPending} type="submit">
            Save task
          </AppButton>
          {status ? <p className="text-sm font-medium text-[#dface3]">{status}</p> : null}
        </form>
      ) : (
        <section
          className="mt-6 rounded-xl border border-white/10 bg-[#18181c] p-4"
          data-testid="tasks-create-unavailable"
        >
          <p className="text-sm font-semibold text-white">Create tasks from a project context.</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Track API creates tasks through a project entry point. Open project tasks from a
            project row to add or manage tasks for that project.
          </p>
        </section>
      )}

      {tasks.length > 0 ? (
        <ul className="mt-6 divide-y divide-white/8" aria-label="Tasks list" data-testid="tasks-list">
          <li className="py-2 text-[11px] font-medium uppercase text-slate-500">
            Workspace {session.currentWorkspace.id}
          </li>
          {tasks.map((task) => {
            const statusLabel = task.active === false ? "Inactive" : "Active";

            return (
              <li key={task.id} className="flex items-center justify-between py-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{task.name}</p>
                  <p className="text-xs text-slate-400">Task · {statusLabel}</p>
                  <p className="text-[11px] text-slate-500">Workspace {task.workspace_id}</p>
                </div>
                <span className="rounded-lg border border-white/10 bg-[#18181c] px-3 py-1 text-xs font-medium text-slate-300">
                  {statusLabel}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <section
          className="mt-6 rounded-xl border border-dashed border-white/12 bg-[#18181c] px-5 py-5 text-sm text-slate-300"
          data-testid="tasks-empty-state"
        >
          <p className="font-semibold text-white">No tasks in this workspace yet.</p>
          <p className="mt-2 text-slate-400">
            {hasProjectScope
              ? "Create a task to keep project planning and tracked work connected from the same catalog surface."
              : "Open a project task entry point to create the first task for that project."}
          </p>
        </section>
      )}

      <div className="mt-6 rounded-xl border border-white/10 bg-[#18181c] p-3 text-sm text-slate-300" data-testid="tasks-summary">
        <p>
          Showing {tasks.length} tasks in workspace {session.currentWorkspace.id}.
        </p>
        <p className="mt-1">Active: {activeCount}</p>
      </div>
    </AppPanel>
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
  return Boolean(value) && typeof value === "object" && Array.isArray((value as Record<string, unknown>)[key]);
}
