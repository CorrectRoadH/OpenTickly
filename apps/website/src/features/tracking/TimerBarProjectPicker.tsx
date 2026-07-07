import { type ReactElement, useRef, useState } from "react";

import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { ProjectsIcon } from "../../shared/ui/icons.tsx";
import { ProjectPickerDropdown } from "./bulk-edit-pickers.tsx";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";
import type { ProjectPickerTask } from "./bulk-edit-pickers.tsx";

export function TimerBarProjectPicker({
  draftProjectId,
  draftTaskId,
  onProjectSelect,
  onTaskSelect,
  projectOptions,
  runningEntry,
  taskName,
  tasks,
  workspaceName,
}: {
  draftProjectId: number | null;
  draftTaskId: number | null;
  onProjectSelect: (id: number | null) => void;
  onTaskSelect: (projectId: number, taskId: number) => void;
  projectOptions: {
    active?: boolean;
    client_name?: string | null;
    color?: string | null;
    id?: number | null;
    name?: string | null;
    pinned?: boolean;
  }[];
  runningEntry: {
    id?: number | null;
    project_id?: number | null;
    pid?: number | null;
    task_id?: number | null;
  } | null;
  taskName?: string;
  tasks: ProjectPickerTask[];
  workspaceName: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const projects = projectOptions
    .filter((p) => p.id != null && p.active !== false)
    .map((p) => ({
      clientName: p.client_name ?? undefined,
      color: resolveProjectColorValue(p),
      id: p.id as number,
      name: p.name ?? "Untitled project",
      pinned: p.pinned === true,
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const displayProjectId =
    runningEntry?.id != null ? resolveTimeEntryProjectId(runningEntry) : draftProjectId;
  const displayTaskId = runningEntry?.id != null ? (runningEntry.task_id ?? null) : draftTaskId;
  const selectedProject = projects.find((p) => p.id === displayProjectId);
  const hasProject = displayProjectId != null || displayTaskId != null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label={`Add a project${selectedProject ? `: ${selectedProject.name}` : ""}`}
        className={`flex items-center justify-center gap-1.5 rounded-md transition hover:bg-[var(--track-row-hover)] ${
          selectedProject
            ? "h-9 max-w-[180px] px-2 text-[var(--track-accent)]"
            : hasProject
              ? "size-9 text-[var(--track-accent)]"
              : "size-9 text-[var(--track-text-muted)] hover:text-white"
        }`}
        onClick={() => setOpen((prev) => !prev)}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        type="button"
      >
        {selectedProject ? (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: selectedProject.color }}
          />
        ) : (
          <ProjectsIcon className="size-4 shrink-0" />
        )}
        {selectedProject ? (
          <span
            className="min-w-0 truncate text-[12px] font-medium"
            style={{ color: selectedProject.color }}
          >
            {taskName ? `${selectedProject.name} | ${taskName}` : selectedProject.name}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[280px]"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== "INPUT") {
              e.preventDefault();
            }
          }}
        >
          <ProjectPickerDropdown
            onSelect={(projectId) => {
              setOpen(false);
              onProjectSelect(projectId);
            }}
            onTaskSelect={(projectId, taskId) => {
              setOpen(false);
              onTaskSelect(projectId, taskId);
            }}
            projects={projects}
            tasks={tasks}
            workspaceName={workspaceName}
          />
        </div>
      ) : null}
    </div>
  );
}
