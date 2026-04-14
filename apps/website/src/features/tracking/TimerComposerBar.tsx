import { type ChangeEvent, type ReactElement, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useCreateTagMutation,
  useCreateTimeEntryMutation,
  useFavoritesQuery,
  useTasksQuery,
  useTimeEntriesQuery,
} from "../../shared/query/web-shell.ts";
import { ProjectsIcon, TagsIcon } from "../../shared/ui/icons.tsx";
import { TimerActionButton } from "../../shared/ui/TimerActionButton.tsx";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";
import { ManualModeComposer } from "./ManualModeComposer.tsx";
import { sortTimeEntries } from "./overview-data.ts";
import { stabilizeTimeEntryList } from "./time-entry-stability.ts";
import { TimerElapsedDisplay } from "./TimerElapsedDisplay.tsx";
import { TimerComposerSuggestionsDialog } from "./TimerComposerSuggestionsDialog.tsx";
import { ProjectPickerDropdown } from "./bulk-edit-pickers.tsx";
import { useTimerViewStore } from "./store/timer-view-store.ts";
import { useTimerComposer } from "./useTimerComposer.ts";
import { useWorkspaceData } from "./useWorkspaceData.ts";
import { useWeekNavigation } from "./useWeekNavigation.ts";

type StartParams = {
  description?: string;
  projectId?: number;
  tagIds?: number[];
  billable?: boolean;
};

export function TimerComposerBar({
  initialDate,
  onShortcutsToggle,
  startParams,
}: {
  initialDate?: Date;
  onShortcutsToggle: () => void;
  startParams?: StartParams;
}): ReactElement {
  const { t } = useTranslation("tracking");
  const { session, workspaceId, timezone, projectOptions, tagOptions } = useWorkspaceData();
  const composer = useTimerComposer();
  const { setSelectedWeekDate } = useWeekNavigation();
  const timerInputMode = useTimerViewStore((s) => s.timerInputMode);

  const createTimeEntryMutation = useCreateTimeEntryMutation(workspaceId);
  const createTagMutation = useCreateTagMutation(workspaceId);

  // Favorites and tasks for suggestions dialog
  const favoritesQuery = useFavoritesQuery(workspaceId);
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];
  const tasksQuery = useTasksQuery(workspaceId);
  const allTasks = tasksQuery.data?.data ?? [];

  const recentTimeEntriesQuery = useTimeEntriesQuery({});
  const recentWorkspaceEntriesRef = useRef<GithubComTogglTogglApiInternalModelsTimeEntry[]>([]);
  const nextEntries = sortTimeEntries(recentTimeEntriesQuery.data ?? []).filter(
    (entry) => (entry.workspace_id ?? entry.wid) === workspaceId,
  );
  const recentWorkspaceEntries = stabilizeTimeEntryList(
    recentWorkspaceEntriesRef.current,
    nextEntries,
  );
  recentWorkspaceEntriesRef.current = recentWorkspaceEntries;

  // Apply initialDate if provided (e.g. from URL params)
  useEffect(() => {
    if (initialDate) {
      setSelectedWeekDate(initialDate);
    }
  }, [initialDate, setSelectedWeekDate]);

  // Auto-start timer from URL params
  const startParamsConsumedRef = useRef(false);
  const currentEntryLoaded =
    !composer.currentTimeEntryQuery.isPending && !composer.currentTimeEntryQuery.isFetching;
  useEffect(() => {
    if (!startParams || startParamsConsumedRef.current || !currentEntryLoaded) return;
    startParamsConsumedRef.current = true;

    void composer.handleStartFromUrl(startParams).then(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("description");
      url.searchParams.delete("desc");
      url.searchParams.delete("project_id");
      url.searchParams.delete("tag_ids");
      url.searchParams.delete("billable");
      url.searchParams.delete("wid");
      window.history.replaceState(window.history.state, "", url.toString());
    });
  }, [startParams, currentEntryLoaded, composer]);

  // Keyboard shortcuts
  const handleGlobalKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }

    if (event.key === "?") {
      event.preventDefault();
      onShortcutsToggle();
      return;
    }

    if (event.key === "n") {
      event.preventDefault();
      composer.timerDescriptionInputRef.current?.focus();
      return;
    }

    if (event.key === "s" && composer.runningEntry?.id != null) {
      event.preventDefault();
      void composer.handleTimerAction();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  });

  return (
    <div className="flex min-h-[70px] flex-wrap items-center gap-x-3 gap-y-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="timer-description">
          Time entry description
        </label>
        <input
          className="h-10 w-full bg-transparent text-[14px] font-medium text-white outline-none placeholder:text-[var(--track-text-muted)]"
          id="timer-description"
          ref={composer.timerDescriptionInputRef as unknown as React.LegacyRef<HTMLInputElement>}
          onBlur={() => {
            void composer.handleRunningDescriptionCommit();
          }}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            if (composer.runningEntry?.id != null) {
              composer.setRunningDescription(event.target.value);
              return;
            }
            composer.setDraftDescription(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (composer.runningEntry?.id != null) {
              event.currentTarget.blur();
            } else {
              void composer.handleTimerAction();
            }
          }}
          onFocus={composer.handleIdleDescriptionFocus}
          placeholder={t("whatAreYouWorkingOn")}
          value={composer.timerDescriptionValue}
        />
      </div>
      <TimerBarProjectPicker
        draftProjectId={composer.draftProjectId}
        onProjectSelect={(projectId) => {
          if (composer.runningEntry?.id != null) {
            const wid = composer.runningEntry.workspace_id ?? composer.runningEntry.wid;
            if (typeof wid === "number") {
              const picked =
                projectId == null ? null : (projectOptions.find((p) => p.id === projectId) ?? null);
              void composer.updateTimeEntryMutation.mutateAsync({
                request: {
                  projectColor: picked?.color ?? null,
                  projectId,
                  projectName: picked?.name ?? null,
                },
                timeEntryId: composer.runningEntry.id,
                workspaceId: wid,
              });
            }
          } else {
            composer.setDraftProjectId(projectId);
            composer.setDraftTaskId(null);
          }
        }}
        projectOptions={projectOptions}
        runningEntry={composer.runningEntry}
        taskName={(() => {
          const taskId = composer.runningEntry?.task_id ?? composer.draftTaskId;
          if (taskId == null) return undefined;
          return allTasks.find((t) => t.id === taskId)?.name ?? undefined;
        })()}
        workspaceName={
          session.availableWorkspaces.find((w) => w.id === workspaceId)?.name ?? "Workspace"
        }
      />
      <TimerBarTagPicker
        draftTagIds={composer.draftTagIds}
        onCreateTag={async (name) => {
          await createTagMutation.mutateAsync(name);
        }}
        onTagToggle={(tagId) => {
          if (composer.runningEntry?.id != null) {
            const wid = composer.runningEntry.workspace_id ?? composer.runningEntry.wid;
            const currentTags = composer.runningEntry.tag_ids ?? [];
            const nextTags = currentTags.includes(tagId)
              ? currentTags.filter((id) => id !== tagId)
              : [...currentTags, tagId];
            if (typeof wid === "number") {
              void composer.updateTimeEntryMutation.mutateAsync({
                request: { tagIds: nextTags },
                timeEntryId: composer.runningEntry.id,
                workspaceId: wid,
              });
            }
          } else {
            composer.setDraftTagIds(
              composer.draftTagIds.includes(tagId)
                ? composer.draftTagIds.filter((id) => id !== tagId)
                : [...composer.draftTagIds, tagId],
            );
          }
        }}
        runningEntry={composer.runningEntry}
        tagOptions={tagOptions}
      />
      <button
        aria-label={composer.draftBillable ? "Set as non-billable" : "Set as billable"}
        className={`flex size-9 items-center justify-center rounded-md transition hover:bg-[var(--track-row-hover)] ${
          (
            composer.runningEntry?.id != null
              ? composer.runningEntry.billable
              : composer.draftBillable
          )
            ? "text-[var(--track-accent)]"
            : "text-[var(--track-text-muted)] hover:text-white"
        }`}
        onClick={() => {
          if (composer.runningEntry?.id != null) {
            const wid = composer.runningEntry.workspace_id ?? composer.runningEntry.wid;
            if (typeof wid === "number") {
              void composer.updateTimeEntryMutation.mutateAsync({
                request: { billable: !composer.runningEntry.billable },
                timeEntryId: composer.runningEntry.id,
                workspaceId: wid,
              });
            }
          } else {
            composer.setDraftBillable(!composer.draftBillable);
          }
        }}
        type="button"
      >
        <span className="text-[14px] font-semibold">$</span>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {timerInputMode === "manual" && composer.runningEntry == null ? (
          <ManualModeComposer
            onAddTimeEntry={(start, stop) => {
              const durationSec = Math.round((stop.getTime() - start.getTime()) / 1000);
              void createTimeEntryMutation.mutateAsync({
                billable: composer.draftBillable,
                description: composer.timerDescriptionValue.trim(),
                duration: durationSec,
                projectId: composer.draftProjectId ?? null,
                start: start.toISOString(),
                stop: stop.toISOString(),
                tagIds: composer.draftTagIds ?? [],
                taskId: composer.draftTaskId,
              });
            }}
            timezone={timezone}
          />
        ) : (
          <>
            <TimerElapsedDisplay runningEntry={composer.runningEntry} />
            <TimerActionButton
              isRunning={!!composer.runningEntry}
              disabled={composer.timerMutationPending}
              onClick={() => {
                void composer.handleTimerAction();
              }}
            />
          </>
        )}
      </div>
      {composer.composerSuggestionsAnchor ? (
        <ComposerSuggestionsPortal
          composer={composer}
          favorites={favorites}
          projectOptions={projectOptions}
          recentWorkspaceEntries={recentWorkspaceEntries}
          session={session}
          tasks={allTasks}
          workspaceId={workspaceId}
        />
      ) : null}
    </div>
  );
}

function ComposerSuggestionsPortal({
  composer,
  favorites,
  projectOptions,
  recentWorkspaceEntries,
  session,
  tasks,
  workspaceId,
}: {
  composer: ReturnType<typeof useTimerComposer>;
  favorites: Array<{
    description?: string;
    project_id?: number;
    tag_ids?: number[];
    billable?: boolean;
  }>;
  projectOptions: Parameters<typeof TimerComposerSuggestionsDialog>[0]["projects"];
  recentWorkspaceEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  session: ReturnType<typeof useWorkspaceData>["session"];
  tasks: Parameters<typeof TimerComposerSuggestionsDialog>[0]["tasks"];
  workspaceId: number;
}): ReactElement {
  return (
    <TimerComposerSuggestionsDialog
      anchor={composer.composerSuggestionsAnchor!}
      currentWorkspaceId={workspaceId}
      favorites={favorites}
      onClose={composer.closeComposerSuggestions}
      onFavoriteSelect={(fav) => {
        composer.setDraftDescription(fav.description ?? "");
        composer.setDraftProjectId(fav.project_id ?? null);
        composer.setDraftTagIds(fav.tag_ids ?? []);
        composer.setDraftBillable(fav.billable ?? false);
        composer.closeComposerSuggestions();
      }}
      query={composer.timerDescriptionValue}
      onProjectSelect={(projectId) => {
        composer.setDraftProjectId(projectId);
        composer.setDraftTaskId(null);
        composer.closeComposerSuggestions();
      }}
      onTaskSelect={(projectId, taskId) => {
        composer.setDraftProjectId(projectId);
        composer.setDraftTaskId(taskId);
        composer.closeComposerSuggestions();
      }}
      onTimeEntrySelect={(entry) => {
        composer.setDraftDescription(entry.description ?? "");
        composer.setDraftProjectId(resolveTimeEntryProjectId(entry));
        composer.setDraftTaskId(entry.task_id ?? null);
        composer.setDraftTagIds(entry.tag_ids ?? []);
        composer.closeComposerSuggestions();
      }}
      onWorkspaceSelect={(nextWorkspaceId) => {
        composer.switchWorkspace(nextWorkspaceId);
        composer.closeComposerSuggestions();
      }}
      projects={projectOptions}
      searchResults={composer.searchedTimeEntries}
      tasks={tasks}
      timeEntries={recentWorkspaceEntries}
      workspaces={session.availableWorkspaces.map((workspace) => ({
        id: workspace.id,
        isCurrent: workspace.isCurrent,
        name: workspace.name,
      }))}
    />
  );
}

// --- TimerBarProjectPicker & TimerBarTagPicker (moved from WorkspaceTimerPage) ---

function TimerBarProjectPicker({
  draftProjectId,
  onProjectSelect,
  projectOptions,
  runningEntry,
  taskName,
  workspaceName,
}: {
  draftProjectId: number | null;
  onProjectSelect: (id: number | null) => void;
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
  const selectedProject = projects.find((p) => p.id === displayProjectId);
  const hasProject = displayProjectId != null;

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
            projects={projects}
            workspaceName={workspaceName}
          />
        </div>
      ) : null}
    </div>
  );
}

/** @internal Exported for testing only. */
export function TimerBarTagPicker({
  draftTagIds,
  onCreateTag,
  onTagToggle,
  runningEntry,
  tagOptions,
}: {
  draftTagIds: number[];
  onCreateTag?: (name: string) => Promise<unknown>;
  onTagToggle: (tagId: number) => void;
  runningEntry: { id?: number | null; tag_ids?: number[] | null } | null;
  tagOptions: { id: number; name: string }[];
}): ReactElement {
  const { t } = useTranslation("tracking");
  const [isCreating, setIsCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const displayTagIds = runningEntry?.id != null ? (runningEntry.tag_ids ?? []) : draftTagIds;
  const hasTags = displayTagIds.length > 0;
  const displayTags = tagOptions.filter((tag) => displayTagIds.includes(tag.id));
  const tagLabel = (() => {
    if (displayTags.length === 0) return undefined;
    if (displayTags.length === 1) return displayTags[0]?.name;
    return `${displayTags[0]?.name ?? "Tag"} +${displayTags.length - 1}`;
  })();

  const filteredTags = search.trim()
    ? tagOptions.filter((tag) => tag.name.toLowerCase().includes(search.toLowerCase()))
    : tagOptions;

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label={tagLabel ? `Tags: ${tagLabel}` : "Select tags"}
        className={`flex items-center justify-center gap-1.5 rounded-md transition hover:bg-[var(--track-row-hover)] ${
          hasTags
            ? tagLabel
              ? "h-9 max-w-[160px] px-2 text-[var(--track-accent)]"
              : "size-9 text-[var(--track-accent)]"
            : "size-9 text-[var(--track-text-muted)] hover:text-white"
        }`}
        onClick={() => {
          setOpen((prev) => !prev);
          setSearch("");
        }}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        type="button"
      >
        <TagsIcon className="size-4 shrink-0" />
        {tagLabel ? (
          <span className="min-w-0 truncate text-[12px] font-medium">{tagLabel}</span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[220px] rounded-xl border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] py-2 shadow-[0_14px_32px_var(--track-shadow-overlay)]"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== "INPUT") {
              e.preventDefault();
            }
          }}
        >
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--track-text-soft)]">
            {t("tags")}
          </div>
          <div className="px-3 pb-2">
            <input
              className="h-8 w-full rounded-lg border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2.5 text-[12px] text-white outline-none placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)]"
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchTags")}
              type="text"
              value={search}
            />
          </div>
          {filteredTags.length === 0 && !search.trim() ? (
            <div className="px-3 py-2 text-[12px] text-[var(--track-text-soft)]">
              {t("noTagsAvailable")}
            </div>
          ) : filteredTags.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto">
              {filteredTags.map((tag) => {
                const isSelected = displayTagIds.includes(tag.id);
                return (
                  <button
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition hover:bg-white/5 ${
                      isSelected ? "text-[var(--track-accent)]" : "text-white"
                    }`}
                    key={tag.id}
                    onClick={() => onTagToggle(tag.id)}
                    type="button"
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded border text-[11px] ${
                        isSelected
                          ? "border-[var(--track-accent)] bg-[var(--track-accent)] text-white"
                          : "border-[var(--track-border)]"
                      }`}
                    >
                      {isSelected ? "\u2713" : ""}
                    </span>
                    <span className="truncate">{tag.name}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {search.trim() &&
          onCreateTag &&
          !tagOptions.some((t) => t.name.toLowerCase() === search.trim().toLowerCase()) ? (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[var(--track-accent)] transition hover:bg-white/5 disabled:opacity-60"
              disabled={isCreating}
              onClick={() => {
                const trimmed = search.trim();
                setIsCreating(true);
                void onCreateTag(trimmed)
                  .then((result) => {
                    const newTag = result as { id?: number } | undefined;
                    if (typeof newTag?.id === "number") {
                      onTagToggle(newTag.id);
                    }
                    setSearch("");
                  })
                  .finally(() => setIsCreating(false));
              }}
              type="button"
            >
              {isCreating ? "Creating..." : `Create tag \u201c${search.trim()}\u201d`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
