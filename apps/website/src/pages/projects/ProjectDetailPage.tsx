import { AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

type ProjectDetailPageProps = {
  projectId: number;
  workspaceId: number;
};

export function ProjectDetailPage({
  projectId,
  workspaceId,
}: ProjectDetailPageProps): ReactElement {
  return (
    <AppPanel className="bg-white/95">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Project details</h1>
        <p className="text-sm leading-6 text-slate-600">
          Workspace {workspaceId} · Project {projectId}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-600 hover:text-emerald-800"
          href={`/workspaces/${workspaceId}/projects`}
        >
          Back to projects
        </a>
        <a
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-600 hover:text-emerald-800"
          href={`/workspaces/${workspaceId}/tasks?projectId=${projectId}`}
        >
          Open project tasks
        </a>
      </div>
    </AppPanel>
  );
}
