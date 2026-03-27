import { type ReactElement, useEffect, useMemo, useState } from "react";

import type {
  GithubComTogglTogglApiInternalModelsProject,
  GithubComTogglTogglApiInternalModelsTimeEntry,
} from "../../shared/api/generated/public-track/types.gen.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";

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
  query?: string;
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
  query,
  timeEntries,
  workspaces,
}: TimerComposerSuggestionsDialogProps): ReactElement {
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const position = useMemo(() => resolveDialogPosition(anchor), [anchor]);
  const currentWorkspaceName =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.name ?? "Workspace";
  const previousEntries = useMemo(
    () => filterByQuery(buildPreviousEntries(timeEntries), query),
    [timeEntries, query],
  );
  const suggestedProjects = useMemo(
    () => filterProjectsByQuery(buildProjectSuggestions(projects), query),
    [projects, query],
  );

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
        className="pointer-events-auto absolute w-[580px] max-w-[calc(100vw-32px)] rounded-[14px] border border-[#3f3f44] bg-[#1f1f20] shadow-[0_12px_28px_rgba(0,0,0,0.34)]"
        data-testid="timer-composer-suggestions-dialog"
        role="dialog"
        style={position}
      >
        {/* Workspace selector */}
        <div className="flex items-center gap-3 px-5 py-3">
          <WsBriefcaseIcon />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-white">
            {currentWorkspaceName}
          </span>
          <div className="relative">
            <button
              className="flex items-center gap-1 text-[14px] text-[#a4a4a4] transition hover:text-white"
              onClick={() => setWorkspaceMenuOpen((current) => !current)}
              type="button"
            >
              <span>Change</span>
              <ChevronDownIcon />
            </button>
            {workspaceMenuOpen ? (
              <div className="absolute right-0 top-8 z-10 min-w-[240px] rounded-[10px] border border-[#3d3d42] bg-[#242426] py-2 shadow-[0_16px_32px_rgba(0,0,0,0.32)]">
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

        {previousEntries.length > 0 ? (
          <>
            <div className="px-5 pb-1 pt-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a0a0a5]">
                Previously tracked time entries
              </div>
            </div>
            <div>
              {previousEntries.map((entry) => {
                const hasDescription = Boolean(entry.description?.trim());
                const projectLabel = entry.project_name?.trim();
                const projectColor = entry.project_color?.trim();
                return (
                  <button
                    className="flex w-full items-center overflow-hidden px-5 py-2 text-left transition hover:bg-white/4"
                    key={buildEntryKey(entry)}
                    onClick={() => onTimeEntrySelect(entry)}
                    tabIndex={-1}
                    type="button"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-[14px]">
                      {hasDescription ? (
                        <span className="truncate text-[#cfcfd4]">{entry.description?.trim()}</span>
                      ) : null}
                      {projectLabel ? (
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span
                            className="size-[6px] shrink-0 rounded-full"
                            style={{ backgroundColor: projectColor ?? "#9ca3af" }}
                          />
                          <span
                            className="truncate text-[14px]"
                            style={{ color: projectColor ?? "#9ca3af" }}
                          >
                            {projectLabel}
                          </span>
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {suggestedProjects.length > 0 ? (
          <>
            <div className="px-5 pb-1 pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a0a0a5]">
                Projects
              </div>
            </div>
            <div className="pb-2">
              {suggestedProjects.map((project) => {
                const color = resolveProjectColorValue(project);
                return (
                  <button
                    className="flex w-full items-center gap-1.5 overflow-hidden px-5 py-2 text-left transition hover:bg-white/4"
                    key={project.id}
                    onClick={() => {
                      if (project.id != null) {
                        onProjectSelect(project.id);
                      }
                    }}
                    tabIndex={-1}
                    type="button"
                  >
                    <span
                      className="size-[6px] shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-[14px]" style={{ color }}>
                      {project.name?.trim() || "Untitled project"}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function WsBriefcaseIcon(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      fill="var(--track-text-muted)"
      fillRule="evenodd"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        clipRule="evenodd"
        d="M6.648 0C5.135 0 3.86 1.127 3.672 2.628L3.625 3H2a2 2 0 0 0-2 2v2h16V5a2 2 0 0 0-2-2h-1.625l-.046-.372A2.854 2.854 0 0 0 9.352 0H6.648ZM5.8 3h4.4l-.04-.196A1.18 1.18 0 0 0 9.18 2H6.82c-.477 0-.888.336-.981.804L5.8 3Z"
      />
      <path d="M16 8H0v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    </svg>
  );
}

function ChevronDownIcon(): ReactElement {
  return (
    <svg aria-hidden="true" fill="#A4A4A4" height="5" viewBox="0 0 8 5" width="10">
      <path d="M3.6 4.4c.2.1.6.1.8 0l3-3c.1-.2.1-.6 0-.8-.2-.1-.6-.1-.8 0l-3 3h.8l-3-3C1.2.5.8.5.6.6c-.1.2-.1.6 0 .8l3 3z" />
    </svg>
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

function filterByQuery(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  query?: string,
): GithubComTogglTogglApiInternalModelsTimeEntry[] {
  const trimmed = query?.trim().toLowerCase();
  if (!trimmed) return entries;
  return entries.filter((entry) => {
    const desc = (entry.description ?? "").toLowerCase();
    const project = (entry.project_name ?? "").toLowerCase();
    return desc.includes(trimmed) || project.includes(trimmed);
  });
}

function filterProjectsByQuery(
  projects: GithubComTogglTogglApiInternalModelsProject[],
  query?: string,
): GithubComTogglTogglApiInternalModelsProject[] {
  const trimmed = query?.trim().toLowerCase();
  if (!trimmed) return projects;
  return projects.filter((project) => {
    const name = (project.name ?? "").toLowerCase();
    const client = (project.client_name ?? "").toLowerCase();
    return name.includes(trimmed) || client.includes(trimmed);
  });
}
