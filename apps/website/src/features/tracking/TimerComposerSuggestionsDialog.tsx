import { type ReactElement, useMemo, useRef, useState } from "react";

import { MenuSeparator } from "@opentoggl/web-ui";
import type {
  GithubComTogglTogglApiInternalModelsProject,
  GithubComTogglTogglApiInternalModelsTimeEntry,
  ModelsFavorite,
} from "../../shared/api/generated/public-track/types.gen.ts";
import type { TimeEntrySearchItem } from "../../shared/api/generated/web/types.gen.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { ChevronDown } from "lucide-react";
import { PinIcon, PlayIcon, ProjectsIcon, TagsIcon } from "../../shared/ui/icons.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";

export type TimerComposerSuggestionsAnchor = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type TimerComposerSuggestionsDialogProps = {
  anchor: TimerComposerSuggestionsAnchor;
  currentWorkspaceId: number;
  favorites?: ModelsFavorite[];
  onClose: () => void;
  onFavoriteSelect?: (favorite: ModelsFavorite) => void;
  onProjectSelect: (projectId: number) => void;
  onTimeEntrySelect: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onWorkspaceSelect: (workspaceId: number) => void;
  projects: GithubComTogglTogglApiInternalModelsProject[];
  query?: string;
  searchResults?: TimeEntrySearchItem[];
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
  favorites = [],
  onClose,
  onFavoriteSelect,
  onProjectSelect,
  onTimeEntrySelect,
  onWorkspaceSelect,
  projects,
  query,
  searchResults,
  timeEntries,
  workspaces,
}: TimerComposerSuggestionsDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const position = useMemo(() => resolveDialogPosition(anchor), [anchor]);
  const currentWorkspaceName =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.name ?? "Workspace";
  const filteredFavorites = useMemo(
    () => filterFavoritesByQuery(favorites, query),
    [favorites, query],
  );
  const hasQuery = Boolean(query?.trim());
  const previousEntries = useMemo(() => {
    if (hasQuery && searchResults && searchResults.length > 0) {
      return searchResults.map(searchItemToTimeEntry);
    }
    return filterByQuery(buildPreviousEntries(timeEntries), query);
  }, [timeEntries, query, hasQuery, searchResults]);
  const suggestedProjects = useMemo(
    () => filterProjectsByQuery(buildProjectSuggestions(projects), query),
    [projects, query],
  );

  useDismiss(dialogRef, true, onClose);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40"
      data-testid="timer-composer-suggestions-layer"
    >
      <div
        aria-label="Timer suggestions"
        className="pointer-events-auto absolute w-[520px] max-w-[calc(100vw-32px)] rounded-[14px] border border-[var(--track-overlay-border-strong)] bg-[var(--track-overlay-surface)] shadow-[0_18px_48px_var(--track-shadow-overlay)]"
        data-testid="timer-composer-suggestions-dialog"
        ref={dialogRef}
        role="dialog"
        style={position}
      >
        <div className="flex items-center gap-2 px-2.5 py-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface-raised)]">
            <WsBriefcaseIcon />
          </div>
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">
            {currentWorkspaceName}
          </p>
          <div className="relative">
            <button
              className="flex items-center gap-1 rounded-[7px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface-raised)] px-2 py-1 text-[11px] font-semibold text-[var(--track-text-muted)] transition hover:text-white"
              onClick={() => setWorkspaceMenuOpen((current) => !current)}
              type="button"
            >
              <span>Change</span>
              <ChevronDownIcon />
            </button>
            {workspaceMenuOpen ? (
              <div className="absolute right-0 top-8 z-10 min-w-[220px] rounded-[10px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface-raised)] p-1 shadow-[0_16px_32px_var(--track-shadow-subtle)]">
                {workspaces.map((workspace) => (
                  <button
                    className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[12px] transition hover:bg-white/4 ${
                      workspace.id === currentWorkspaceId
                        ? "text-white"
                        : "text-[var(--track-overlay-text-muted)]"
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
                      <span className="text-[11px] font-semibold text-[var(--track-accent-text)]">
                        Current
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {filteredFavorites.length > 0 ? (
          <>
            <MenuSeparator />
            <SuggestionSectionTitle title="Favorites" />
            <div className="px-1 pb-1">
              {filteredFavorites.map((fav) => {
                const label = fav.description?.trim() || fav.project_name || "Untitled";
                const projectLabel = fav.project_name?.trim();
                const projectColor = fav.project_color?.trim();
                return (
                  <SuggestionRow
                    key={fav.favorite_id}
                    onClick={() => onFavoriteSelect?.(fav)}
                    prefix={<PlayIcon className="size-3.5 text-[var(--track-text-muted)]" />}
                    subtitle={projectLabel}
                    subtitleColor={projectColor ?? "var(--track-text-muted)"}
                    tags={fav.tags?.filter(Boolean)}
                    title={label}
                  />
                );
              })}
            </div>
          </>
        ) : null}

        {previousEntries.length > 0 ? (
          <>
            <MenuSeparator />
            <SuggestionSectionTitle title="Previously tracked time entries" />
            <div className="px-1 pb-1">
              {previousEntries.map((entry) => {
                const hasDescription = Boolean(entry.description?.trim());
                const projectLabel = entry.project_name?.trim();
                const projectColor = entry.project_color?.trim();
                return (
                  <SuggestionRow
                    key={buildEntryKey(entry)}
                    onClick={() => onTimeEntrySelect(entry)}
                    prefix={
                      projectLabel ? (
                        <ProjectsIcon
                          className="size-3.5"
                          style={{ color: projectColor ?? "var(--track-text-muted)" }}
                        />
                      ) : (
                        <span
                          className="size-[7px] rounded-full"
                          style={{ backgroundColor: projectColor ?? "var(--track-text-muted)" }}
                        />
                      )
                    }
                    subtitle={projectLabel}
                    subtitleColor={projectColor ?? "var(--track-text-muted)"}
                    tags={entry.tags?.filter(Boolean)}
                    title={
                      hasDescription
                        ? (entry.description?.trim() ?? "")
                        : projectLabel || "Untitled"
                    }
                  />
                );
              })}
            </div>
          </>
        ) : null}

        {suggestedProjects.length > 0 ? (
          <>
            <MenuSeparator />
            <SuggestionSectionTitle title="Projects" />
            <div className="px-1 pb-1">
              {suggestedProjects.map((project) => {
                const color = resolveProjectColorValue(project);
                return (
                  <SuggestionRow
                    key={project.id}
                    onClick={() => {
                      if (project.id != null) {
                        onProjectSelect(project.id);
                      }
                    }}
                    prefix={
                      project.pinned ? (
                        <PinIcon className="size-3.5" style={{ color }} />
                      ) : (
                        <span
                          className="size-[7px] rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      )
                    }
                    subtitle="Project"
                    title={project.name?.trim() || "Untitled project"}
                    titleColor={color}
                  />
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
    <ChevronDown
      aria-hidden="true"
      className="text-[var(--track-text-muted)]"
      size={10}
      strokeWidth={2}
    />
  );
}

function SuggestionSectionTitle({ title }: { title: string }): ReactElement {
  return (
    <div className="px-2.5 pb-0.5 pt-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--track-text-muted)]">
        {title}
      </div>
    </div>
  );
}

function SuggestionRow({
  onClick,
  prefix,
  subtitle,
  subtitleColor,
  tags,
  title,
  titleColor,
}: {
  onClick: () => void;
  prefix?: ReactElement;
  subtitle?: string;
  subtitleColor?: string;
  tags?: string[];
  title: string;
  titleColor?: string;
}): ReactElement {
  const visibleTags = tags?.length ? tags.slice(0, 3) : undefined;
  return (
    <button
      className="flex w-full items-center gap-2 overflow-hidden rounded-[9px] px-2 py-1.5 text-left transition hover:bg-white/4"
      onClick={onClick}
      tabIndex={-1}
      type="button"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-[var(--track-overlay-surface-raised)]">
        {prefix ?? <PlayIcon className="size-3.5 text-[var(--track-text-muted)]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[13px] font-medium"
          style={{ color: titleColor ?? "white" }}
        >
          {title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px]">
          {subtitle ? (
            <span
              className="truncate"
              style={{ color: subtitleColor ?? "var(--track-text-muted)" }}
            >
              {subtitle}
            </span>
          ) : null}
          {visibleTags ? (
            <span className="flex shrink-0 items-center gap-0.5 text-[var(--track-text-muted)]">
              <TagsIcon className="size-2.5" />
              <span className="truncate">{visibleTags.join(", ")}</span>
            </span>
          ) : null}
        </span>
      </span>
    </button>
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
  const active = projects.filter((project) => project.id != null && project.active !== false);
  const pinned = active.filter((p) => p.pinned);
  const unpinned = active.filter((p) => !p.pinned);
  return [...pinned, ...unpinned].slice(0, 5);
}

function buildEntryKey(entry: GithubComTogglTogglApiInternalModelsTimeEntry): string {
  return [
    entry.description?.trim().toLowerCase() || "",
    String(resolveTimeEntryProjectId(entry) ?? 0),
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

function filterFavoritesByQuery(favorites: ModelsFavorite[], query?: string): ModelsFavorite[] {
  const trimmed = query?.trim().toLowerCase();
  if (!trimmed) return favorites;
  return favorites.filter((fav) => {
    const desc = (fav.description ?? "").toLowerCase();
    const project = (fav.project_name ?? "").toLowerCase();
    return desc.includes(trimmed) || project.includes(trimmed);
  });
}

function searchItemToTimeEntry(
  item: TimeEntrySearchItem,
): GithubComTogglTogglApiInternalModelsTimeEntry {
  return {
    id: item.id,
    workspace_id: item.workspace_id,
    description: item.description,
    project_id: item.project_id,
    project_name: item.project_name,
    project_color: item.project_color,
    tag_ids: item.tag_ids,
    billable: item.billable,
    start: item.start,
    stop: item.stop,
    duration: item.duration,
  };
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
