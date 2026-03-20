import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

const sampleProjects = [
  { id: 1, name: "Website Revamp", private: true, archived: false },
  { id: 2, name: "Community Launch", private: false, archived: true },
  { id: 3, name: "Mobile v2", private: true, archived: false },
];

export function ProjectsPage(): ReactElement {
  const privateCount = sampleProjects.filter((project) => project.private).length;
  const archivedCount = sampleProjects.filter((project) => project.archived).length;

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
          const visibilityLabel = project.private ? "Private" : "Public";
          const statusLabel = project.archived ? "Archived" : "Active";

          return (
            <li key={project.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                <p className="text-xs text-slate-600">
                  {visibilityLabel} project · {statusLabel}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {visibilityLabel}
                {project.archived ? " • Archived" : ""}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          Private projects ({privateCount} with <code>private: true</code>) stay hidden unless a member is explicitly added.
          Archived projects ({archivedCount} with <code>archived: true</code>) remain listed for history but are read-only
          for new time or task activity.
        </p>
      </div>
    </AppPanel>
  );
}
