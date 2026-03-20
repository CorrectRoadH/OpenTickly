import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

const sampleProjects = [
  { id: "proj_1", workspace_id: "ws_202", name: "Website Revamp", active: true, is_private: true },
  { id: "proj_2", workspace_id: "ws_202", name: "Community Launch", active: false, is_private: false },
  { id: "proj_3", workspace_id: "ws_202", name: "Mobile v2", active: true, is_private: true },
];

export function ProjectsPage(): ReactElement {
  const privateCount = sampleProjects.filter((project) => project.is_private).length;
  const activeCount = sampleProjects.filter((project) => project.active).length;

  return (
    <AppPanel className="bg-white/95">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Projects</h1>
          <p className="text-sm leading-6 text-slate-600">
            Track workspace projects with quick visibility and status cues.
          </p>
        </div>
        <AppButton type="button">Create project</AppButton>
      </div>

      <ul className="mt-6 divide-y divide-slate-200" aria-label="Projects list">
        {sampleProjects.map((project) => {
          const visibilityLabel = project.is_private ? "Private" : "Public";
          const statusLabel = project.active ? "Active" : "Inactive";

          return (
            <li key={project.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                <p className="text-xs text-slate-600">{visibilityLabel} project · {statusLabel}</p>
                <p className="text-[11px] text-slate-500">Workspace {project.workspace_id}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {visibilityLabel}
                {project.active ? " • Active" : " • Inactive"}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          Private projects ({privateCount} with <code>is_private: true</code>) stay hidden unless a member is explicitly
          added. Active projects ({activeCount} with <code>active: true</code>) are available for new time and task
          activity; inactive projects remain visible for reference within workspace {sampleProjects[0]?.workspace_id} but
          are read-only.
        </p>
      </div>
    </AppPanel>
  );
}
