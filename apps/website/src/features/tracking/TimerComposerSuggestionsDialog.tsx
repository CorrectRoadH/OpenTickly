import { type ReactElement, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { MenuSeparator } from "@opentickly/web-ui";
import type {
  GithubComTogglTogglApiInternalModelsProject,
  GithubComTogglTogglApiInternalModelsTimeEntry,
  ModelsFavorite,
  ModelsTask,
} from "../../shared/api/generated/public-track/types.gen.ts";
import type { TimeEntrySearchItem } from "../../shared/api/generated/web/types.gen.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { PinIcon, PlayIcon, ProjectsIcon } from "../../shared/ui/icons.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";
import {
  WsBriefcaseIcon,
  ChevronDownIcon,
  SuggestionSectionTitle,
  SuggestionRow,
} from "./ComposerSuggestionRows.tsx";
import {
  resolveDialogPosition,
  buildPreviousEntries,
  buildProjectSuggestions,
  buildEntryKey,
  filterByQuery,
  filterFavoritesByQuery,
  searchItemToTimeEntry,
  resolveTaskName,
  buildTaskSuggestions,
  filterTasksByQuery,
  filterProjectsByQuery,
} from "./composer-suggestions.ts";

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
  onTaskSelect?: (projectId: number, taskId: number) => void;
  onTimeEntrySelect: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onWorkspaceSelect: (workspaceId: number) => void;
  projects: GithubComTogglTogglApiInternalModelsProject[];
  query?: string;
  searchResults?: TimeEntrySearchItem[];
  tasks?: ModelsTask[];
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
  onTaskSelect,
  onTimeEntrySelect,
  onWorkspaceSelect,
  projects,
  query,
  searchResults,
  tasks = [],
  timeEntries,
  workspaces,
}: TimerComposerSuggestionsDialogProps): ReactElement {
  const { t } = useTranslation("tracking");
  const dialogRef = useRef<HTMLDivElement>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const position = resolveDialogPosition(anchor);
  const currentWorkspaceName =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.name ??
    t("workspaceFallback");
  const filteredFavorites = filterFavoritesByQuery(favorites, query);
  const hasQuery = Boolean(query?.trim());
  const previousEntries = (() => {
    if (hasQuery && searchResults && searchResults.length > 0) {
      return buildPreviousEntries(searchResults.map(searchItemToTimeEntry));
    }
    return filterByQuery(buildPreviousEntries(timeEntries), query);
  })();
  const suggestedProjects = filterProjectsByQuery(buildProjectSuggestions(projects), query);
  const suggestedTasks = filterTasksByQuery(buildTaskSuggestions(tasks, projects), query);

  useDismiss(dialogRef, true, onClose);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40"
      data-testid="timer-composer-suggestions-layer"
    >
      <div
        aria-label={t("timerSuggestions")}
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
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--track-text)]">
            {currentWorkspaceName}
          </p>
          <div className="relative">
            <button
              aria-expanded={workspaceMenuOpen}
              aria-haspopup="listbox"
              aria-label={t("change")}
              className={`flex items-center gap-1.5 rounded-[8px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface-raised)] px-2.5 py-1.5 text-[12px] font-semibold shadow-[var(--track-depth-shadow-rest)] transition-all duration-[var(--duration-press)] hover:-translate-y-px hover:border-[var(--track-control-border)] hover:text-[var(--track-text)] hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-0.5 active:shadow-[var(--track-depth-shadow-active)] ${
                workspaceMenuOpen ? "text-[var(--track-text)]" : "text-[var(--track-text-muted)]"
              }`}
              onClick={() => setWorkspaceMenuOpen((current) => !current)}
              style={{ transitionTimingFunction: "var(--ease-press)" }}
              type="button"
            >
              <span>{t("change")}</span>
              <ChevronDownIcon expanded={workspaceMenuOpen} />
            </button>
            {workspaceMenuOpen ? (
              <div
                aria-label={t("workspaceFallback")}
                className="absolute right-0 top-full z-30 mt-2 max-h-[220px] w-[280px] max-w-[calc(100vw-48px)] overflow-y-auto rounded-[12px] border border-[var(--track-overlay-border-strong)] bg-[var(--track-overlay-surface-raised)] p-1.5 shadow-[0_16px_32px_var(--track-shadow-subtle)]"
                role="listbox"
              >
                {workspaces.map((workspace) => (
                  <button
                    aria-selected={workspace.id === currentWorkspaceId}
                    className={`flex w-full items-center justify-between gap-3 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition hover:bg-white/4 ${
                      workspace.id === currentWorkspaceId
                        ? "text-[var(--track-text)]"
                        : "text-[var(--track-overlay-text-muted)]"
                    }`}
                    key={workspace.id}
                    onClick={() => {
                      onWorkspaceSelect(workspace.id);
                      setWorkspaceMenuOpen(false);
                    }}
                    type="button"
                    role="option"
                  >
                    <span className="truncate">{workspace.name}</span>
                    {workspace.id === currentWorkspaceId ? (
                      <span className="text-[11px] font-semibold text-[var(--track-accent-text)]">
                        {t("current")}
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
            <SuggestionSectionTitle title={t("favorites")} />
            <div className="px-1 pb-1">
              {filteredFavorites.map((fav) => {
                const label = fav.description?.trim() || fav.project_name || t("untitledFallback");
                const projectLabel = fav.project_name?.trim();
                return (
                  <SuggestionRow
                    key={fav.favorite_id}
                    onClick={() => onFavoriteSelect?.(fav)}
                    prefix={<PlayIcon className="size-3.5 text-[var(--track-text-muted)]" />}
                    subtitle={projectLabel}
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
            <SuggestionSectionTitle title={t("previouslyTrackedTimeEntries")} />
            <div className="px-1 pb-1">
              {previousEntries.map((entry) => {
                const hasDescription = Boolean(entry.description?.trim());
                const projectLabel = entry.project_name?.trim();
                const projectColor = entry.project_color?.trim();
                const taskName = entry.task_id ? resolveTaskName(entry.task_id, tasks) : undefined;
                const subtitleLabel =
                  projectLabel && taskName ? `${projectLabel} | ${taskName}` : projectLabel;
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
                    subtitle={subtitleLabel}
                    tags={entry.tags?.filter(Boolean)}
                    title={
                      hasDescription
                        ? (entry.description?.trim() ?? "")
                        : projectLabel || t("untitledFallback")
                    }
                  />
                );
              })}
            </div>
          </>
        ) : null}

        {suggestedProjects.length > 0 || suggestedTasks.length > 0 ? (
          <>
            <MenuSeparator />
            <SuggestionSectionTitle title={t("projects")} />
            <div className="px-1 pb-1">
              {suggestedTasks.map((task) => {
                const color = resolveProjectColorValue({
                  color: task.project_color,
                  name: task.project_name,
                });
                const label = `${task.project_name?.trim() ?? ""} | ${task.name?.trim() ?? ""}`;
                return (
                  <SuggestionRow
                    key={`task-${task.id}`}
                    onClick={() => {
                      if (task.project_id != null && task.id != null) {
                        onTaskSelect?.(task.project_id, task.id);
                      }
                    }}
                    prefix={<ProjectsIcon className="size-3.5" style={{ color }} />}
                    subtitle={t("project")}
                    title={label}
                  />
                );
              })}
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
                    subtitle={t("project")}
                    title={project.name?.trim() || t("untitledProjectFallback")}
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
