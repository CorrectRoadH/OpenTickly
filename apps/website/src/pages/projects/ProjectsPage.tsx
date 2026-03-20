import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

const sampleProjects = [
  { id: 1, name: "Website Revamp", visibility: "Private", status: "Active" },
  { id: 2, name: "Community Launch", visibility: "Public", status: "Archived" },
  { id: 3, name: "Mobile v2", visibility: "Private", status: "Active" },
];

export function ProjectsPage(): ReactElement {
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
        {sampleProjects.map((project) => (
          <li key={project.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{project.name}</p>
              <p className="text-xs text-slate-600">
                {project.visibility} project · {project.status}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {project.visibility === "Public" ? "Public" : "Private"}
              {project.status === "Archived" ? " • Archived" : ""}
            </span>
          </li>
        ))}
      </ul>
    </AppPanel>
  );
}
