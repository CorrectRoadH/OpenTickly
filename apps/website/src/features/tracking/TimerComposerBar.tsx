import { type ChangeEvent, type ReactElement, useEffect } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateTagMutation,
  useCreateTimeEntryMutation,
  useFavoritesQuery,
  useRecentTimeEntrySuggestionsQuery,
  useTasksQuery,
} from "../../shared/query/web-shell.ts";
import { TimerActionButton } from "../../shared/ui/TimerActionButton.tsx";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { ComposerSuggestionsPortal } from "./ComposerSuggestionsPortal.tsx";
import { ManualModeComposer } from "./ManualModeComposer.tsx";
import { TimerBarProjectPicker } from "./TimerBarProjectPicker.tsx";
import { TimerBarTagPicker } from "./TimerBarTagPicker.tsx";
import { TimerElapsedDisplay } from "./TimerElapsedDisplay.tsx";
import { TimerComposerShortcutMenu } from "./TimerComposerShortcutMenu.tsx";
import { useTimerViewStore } from "./store/timer-view-store.ts";
import { useAutoStartFromParams } from "./useAutoStartFromParams.ts";
import { useComposerGlobalHotkeys } from "./useComposerGlobalHotkeys.ts";
import { useComposerShortcutBridge } from "./useComposerShortcutBridge.ts";
import { useTimerComposer } from "./useTimerComposer.ts";
import { useWorkspaceData } from "./useWorkspaceData.ts";
import { useWeekNavigation } from "./useWeekNavigation.ts";
import type { ProjectPickerTask } from "./bulk-edit-pickers.tsx";
import type { StartParams } from "./useAutoStartFromParams.ts";

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
  const preferences = useUserPreferences();

  const createTimeEntryMutation = useCreateTimeEntryMutation(workspaceId);
  const createTagMutation = useCreateTagMutation(workspaceId);

  // Inline "@" (project) / "#" (tag) shortcut menu for the composer.
  const { setDescriptionCursor, shortcutMenu } = useComposerShortcutBridge({
    composer,
    createTagMutation,
    preferences,
    projectOptions,
    tagOptions,
  });

  // Favorites and tasks for suggestions dialog
  const favoritesQuery = useFavoritesQuery(workspaceId);
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];
  const tasksQuery = useTasksQuery(workspaceId);
  const allTasks = tasksQuery.data?.data ?? [];

  const recentTimeEntrySuggestionsQuery = useRecentTimeEntrySuggestionsQuery(workspaceId);
  const recentWorkspaceEntries = recentTimeEntrySuggestionsQuery.data ?? [];

  // Apply initialDate if provided (e.g. from URL params)
  useEffect(() => {
    if (initialDate) {
      setSelectedWeekDate(initialDate);
    }
  }, [initialDate, setSelectedWeekDate]);

  // Auto-start timer from URL params
  useAutoStartFromParams(composer, startParams);

  // Keyboard shortcuts
  useComposerGlobalHotkeys({ composer, onShortcutsToggle });

  return (
    <div className="flex min-h-[70px] flex-wrap items-center gap-x-3 gap-y-3 px-5 py-3">
      <div className="relative min-w-0 flex-1">
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
            setDescriptionCursor(event.target.selectionStart ?? event.target.value.length);
            if (composer.runningEntry?.id != null) {
              composer.setRunningDescription(event.target.value);
              return;
            }
            composer.setDraftDescription(event.target.value);
          }}
          onSelect={(event) => {
            setDescriptionCursor(event.currentTarget.selectionStart ?? 0);
          }}
          onKeyDown={(event) => {
            if (shortcutMenu.handleKeyDown(event)) return;
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
        {shortcutMenu.isOpen ? (
          <TimerComposerShortcutMenu
            activeIndex={shortcutMenu.activeIndex}
            items={shortcutMenu.items}
            onHoverIndex={shortcutMenu.setActiveIndex}
            onSelectIndex={shortcutMenu.selectItem}
          />
        ) : null}
      </div>
      <TimerBarProjectPicker
        draftProjectId={composer.draftProjectId}
        draftTaskId={composer.draftTaskId}
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
                  taskId: null,
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
        onTaskSelect={(projectId, taskId) => {
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
                  taskId,
                },
                timeEntryId: composer.runningEntry.id,
                workspaceId: wid,
              });
            }
          } else {
            composer.setDraftProjectId(projectId);
            composer.setDraftTaskId(taskId);
          }
        }}
        projectOptions={projectOptions}
        runningEntry={composer.runningEntry}
        taskName={(() => {
          const taskId = composer.runningEntry?.task_id ?? composer.draftTaskId;
          if (taskId == null) return undefined;
          return allTasks.find((t) => t.id === taskId)?.name ?? undefined;
        })()}
        tasks={
          allTasks
            .filter(
              (task): task is typeof task & { id: number; name: string; project_id: number } =>
                task.id != null && task.name != null && task.project_id != null,
            )
            .map((task) => ({
              id: task.id,
              name: task.name,
              projectId: task.project_id,
            })) satisfies ProjectPickerTask[]
        }
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
      {composer.composerSuggestionsAnchor && !shortcutMenu.isOpen ? (
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
