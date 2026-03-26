import { type ReactElement, useEffect, useMemo, useState } from "react";

import type {
  GithubComTogglTogglApiInternalModelsProject,
  GithubComTogglTogglApiInternalModelsTimeEntry,
} from "../../shared/api/generated/public-track/types.gen.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { TrackingIcon } from "./tracking-icons.tsx";

export type TimerComposerSuggestionsAnchor = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type TimerComposerSuggestionsDialogProps = {
  anchor: TimerComposerSuggestionsAnchor;
  currentWorkspaceId: number;
  onClose: () => void;
  onProjectSelect: (projectId: number) => void;
  onTimeEntrySelect: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onWorkspaceSelect: (workspaceId: number) => void;
  projects: GithubComTogglTogglApiInternalModelsProject[];
  timeEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  workspaces: Array<{
    id: number;
    isCurrent?: boolean;
    name: string;
  }>;
};

export function TimerComposerSuggestionsDialog({
  anchor,
  currentWorkspaceId,
  onClose,
  onProjectSelect,
  onTimeEntrySelect,
  onWorkspaceSelect,
  projects,
  timeEntries,
  workspaces,
}: TimerComposerSuggestionsDialogProps): ReactElement {
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const position = useMemo(() => resolveDialogPosition(anchor), [anchor]);
  const currentWorkspaceName =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.name ?? "Workspace";
  const previousEntries = useMemo(() => buildPreviousEntries(timeEntries), [timeEntries]);
  const suggestedProjects = useMemo(() => buildProjectSuggestions(projects), [projects]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-testid="timer-composer-suggestions-dialog"]')) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClose]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40"
      data-testid="timer-composer-suggestions-layer"
    >
      <div
        aria-label="Timer suggestions"
        className="pointer-events-auto absolute w-[580px] max-w-[calc(100vw-32px)] rounded-[14px] border border-[#3f3f44] bg-[#1f1f20] py-3 shadow-[0_12px_28px_rgba(0,0,0,0.34)]"
        data-testid="timer-composer-suggestions-dialog"
        role="dialog"
        style={position}
      >
        <div className="border-b border-white/6 px-6 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <TrackingIcon className="size-4 shrink-0 text-[#c7c7cb]" name="projects" />
              <span className="truncate text-[14px] font-semibold text-white">
                {currentWorkspaceName}
              </span>
            </div>
            <div className="relative">
              <button
                className="text-[14px] font-medium text-white"
                onClick={() => setWorkspaceMenuOpen((current) => !current)}
                type="button"
              >
                Change &rsaquo;
              </button>
              {workspaceMenuOpen ? (
                <div className="absolute right-0 top-9 z-10 min-w-[240px] rounded-[10px] border border-[#3d3d42] bg-[#242426] py-2 shadow-[0_16px_32px_rgba(0,0,0,0.32)]">
                  {workspaces.map((workspace) => (
                    <button
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[14px] transition hover:bg-white/4 ${
                        workspace.id === currentWorkspaceId ? "text-white" : "text-[#c9c9ce]"
                      }`}
                      key={workspace.id}
                      onClick={() => {
                        onWorkspaceSelect(workspace.id);
                        setWorkspaceMenuOpen(false);
                      }}
                      type="button"
                    >
                      <span className="truncate">{workspace.name}</span>
                      {workspace.id === currentWorkspaceId ? (
                        <span className="text-[12px] text-[#efc2ea]">Current</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {previousEntries.length > 0 ? (
          <section className="px-6 pb-2 pt-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#a0a0a5]">
              Previously tracked time entries
            </h2>
            <div className="mt-3 space-y-1">
              {previousEntries.map((entry) => {
                const projectLabel = entry.project_name?.trim() || "No project";
                const projectColor = entry.project_color?.trim() || "#9ca3af";
                return (
                  <button
                    className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition hover:bg-white/4"
                    key={buildEntryKey(entry)}
                    onClick={() => onTimeEntrySelect(entry)}
                    type="button"
                  >
                    <TrackingIcon className="size-4 shrink-0 text-[#a0a0a5]" name="track" />
                    <span className="truncate text-[16px] font-medium text-[#cfcfd4]">
                      {entry.description?.trim() || projectLabel}
                    </span>
                    <span className="flex min-w-0 items-center gap-2 text-[16px]">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: projectColor }}
                      />
                      <span className="truncate" style={{ color: projectColor }}>
                        {projectLabel}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {suggestedProjects.length > 0 ? (
          <section className="px-6 pb-2 pt-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#a0a0a5]">
              Projects
            </h2>
            <div className="mt-3 space-y-1">
              {suggestedProjects.map((project) => {
                const color = resolveProjectColorValue(project);
                return (
                  <button
                    className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition hover:bg-white/4"
                    key={project.id}
                    onClick={() => {
                      if (project.id != null) {
                        onProjectSelect(project.id);
                      }
                    }}
                    type="button"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-[16px] font-medium" style={{ color }}>
                      {project.name?.trim() || "Untitled project"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function resolveDialogPosition(anchor: TimerComposerSuggestionsAnchor) {
  return {
    left: Math.max(16, anchor.left),
    top: anchor.top + anchor.height + 12,
  };
}

function buildPreviousEntries(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
): GithubComTogglTogglApiInternalModelsTimeEntry[] {
  const seen = new Set<string>();
  const suggestions: GithubComTogglTogglApiInternalModelsTimeEntry[] = [];

  for (const entry of entries) {
    const key = buildEntryKey(entry);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    suggestions.push(entry);
    if (suggestions.length >= 8) {
      break;
    }
  }

  return suggestions;
}

function buildProjectSuggestions(
  projects: GithubComTogglTogglApiInternalModelsProject[],
): GithubComTogglTogglApiInternalModelsProject[] {
  return projects.filter((project) => project.id != null && project.active !== false).slice(0, 8);
}

function buildEntryKey(entry: GithubComTogglTogglApiInternalModelsTimeEntry): string {
  return [
    entry.description?.trim().toLowerCase() || "",
    String(entry.project_id ?? entry.pid ?? 0),
    (entry.tag_ids ?? []).join(","),
  ].join("::");
}
