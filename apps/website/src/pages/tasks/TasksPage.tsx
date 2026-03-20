import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type FormEvent, type ReactElement, useState } from "react";

import { useCreateTaskMutation, useTasksQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

export function TasksPage(): ReactElement {
  const session = useSession();
  const tasksQuery = useTasksQuery(session.currentWorkspace.id);
  const createTaskMutation = useCreateTaskMutation(session.currentWorkspace.id);
  const [taskName, setTaskName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  if (tasksQuery.isPending) {
    return (
      <AppPanel className="bg-white/95">
        <p className="text-sm text-slate-600">Loading tasks…</p>
      </AppPanel>
    );
  }

  const tasks = tasksQuery.data?.tasks ?? [];
  const activeCount = tasks.filter((task) => task.active).length;

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createTaskMutation.mutateAsync({
      workspace_id: session.currentWorkspace.id,
      name: taskName,
    });
    setTaskName("");
    setStatus("Task created");
  }

  return (
    <AppPanel className="bg-white/95">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Tasks</h1>
          <p className="text-sm leading-6 text-slate-600">
            Contract-backed task records reuse the workspace list skeleton while staying scoped to
            task-level planning work.
          </p>
        </div>
        <AppButton type="button">Create task</AppButton>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={handleCreateTask}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Task name
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            value={taskName}
            onChange={(event) => setTaskName(event.target.value)}
          />
        </label>
        <AppButton type="submit">Save task</AppButton>
        {status ? <p className="text-sm font-medium text-emerald-700">{status}</p> : null}
      </form>

      <ul className="mt-6 divide-y divide-slate-200" aria-label="Tasks list">
        {tasks.map((task) => {
          const statusLabel = task.active ? "Active" : "Inactive";

          return (
            <li key={task.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{task.name}</p>
                <p className="text-xs text-slate-600">Contract-backed task · {statusLabel}</p>
                <p className="text-[11px] text-slate-500">Workspace {task.workspace_id}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {statusLabel}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          This placeholder slice exposes {tasks.length} task{tasks.length === 1 ? "" : "s"} for
          workspace {session.currentWorkspace.id}, with {activeCount} active.
        </p>
      </div>
    </AppPanel>
  );
}
