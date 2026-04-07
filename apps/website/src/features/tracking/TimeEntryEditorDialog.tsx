import type { ReactElement } from "react";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import type { ProjectPickerTask } from "./bulk-edit-pickers.tsx";
import type { DurationFormat, TimeFormat } from "./overview-data.ts";
import { useEditorKeyboard } from "./useEditorKeyboard.ts";
import { useEditorUIState } from "./useEditorUIState.ts";
import { useEditorSideEffects } from "./useEditorSideEffects.ts";

import type {
  TimeEntryEditorAnchor,
  TimeEntryEditorProject,
  TimeEntryEditorTag,
  TimeEntryEditorWorkspace,
} from "./time-entry-editor-types.ts";
import {
  buildSuggestionEntries,
  resolveDescriptionMode,
  resolveEditorPosition,
} from "./time-entry-editor-utils.ts";
import { type EditorContextValue, EditorContextProvider } from "./TimeEntryEditorContext.tsx";
import { EditorHeader } from "./EditorHeader.tsx";
import { EditorDescriptionField } from "./EditorDescriptionField.tsx";
import { EditorPickerBar } from "./EditorPickerBar.tsx";
import { EditorTimeRow } from "./EditorTimeRow.tsx";
import { EditorDiscardConfirmation } from "./EditorDiscardConfirmation.tsx";

export type {
  TimeEntryEditorAnchor,
  TimeEntryEditorProject,
  TimeEntryEditorTag,
  TimeEntryEditorWorkspace,
};

type TimeEntryEditorDialogProps = {
  anchor: TimeEntryEditorAnchor;
  currentWorkspaceId: number;
  description: string;
  durationFormat: DurationFormat;
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  isCreatingProject: boolean;
  isCreatingTag: boolean;
  isDeleting?: boolean;
  isDirty?: boolean;
  isNewEntry?: boolean;
  isPrimaryActionPending: boolean;
  isSaving: boolean;
  onClose: () => void;
  onCreateProject: (name: string, color?: string) => Promise<void> | void;
  onCreateTag: (name: string) => Promise<void> | void;
  onBillableToggle?: () => void;
  onDiscard?: () => void;
  onDuplicate?: () => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onDescriptionChange: (value: string) => void;
  onFavorite?: () => Promise<void> | void;
  onPrimaryAction?: () => void;
  onProjectSelect: (projectId: number | null) => void;
  onSave: () => Promise<void> | void;
  onSplit?: () => Promise<void> | void;
  onStartTimeChange: (time: Date) => void;
  onStopTimeChange: (time: Date) => void;
  onSuggestionEntrySelect?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onTagToggle: (tagId: number) => void;
  onTaskSelect?: (projectId: number, taskId: number) => void;
  onWorkspaceSelect: (workspaceId: number) => void;
  primaryActionIcon: "play" | "stop";
  primaryActionLabel: string;
  projects: TimeEntryEditorProject[];
  recentEntries?: GithubComTogglTogglApiInternalModelsTimeEntry[];
  saveError?: string | null;
  selectedProjectId?: number | null;
  selectedTagIds: number[];
  selectedTaskId?: number | null;
  selectedTaskName?: string | null;
  tags: TimeEntryEditorTag[];
  tasks?: ProjectPickerTask[];
  timeofdayFormat: TimeFormat;
  timezone: string;
  workspaces: TimeEntryEditorWorkspace[];
};

export function TimeEntryEditorDialog({
  anchor,
  currentWorkspaceId,
  description,
  durationFormat,
  entry,
  isCreatingProject,
  isCreatingTag,
  isDeleting = false,
  isDirty = false,
  isNewEntry = false,
  isPrimaryActionPending,
  isSaving,
  onClose,
  onCreateProject,
  onCreateTag,
  onBillableToggle,
  onDiscard,
  onDuplicate,
  onDelete,
  onDescriptionChange,
  onFavorite,
  onPrimaryAction,
  onProjectSelect,
  onSave,
  onSplit,
  onStartTimeChange,
  onStopTimeChange,
  onSuggestionEntrySelect,
  onTagToggle,
  onTaskSelect,
  onWorkspaceSelect,
  primaryActionIcon,
  primaryActionLabel,
  projects,
  recentEntries = [],
  saveError,
  selectedProjectId,
  selectedTagIds,
  selectedTaskName,
  tags,
  tasks,
  timeofdayFormat,
  timezone,
  workspaces,
}: TimeEntryEditorDialogProps): ReactElement {
  const [ui, dispatch] = useEditorUIState();
  const { picker } = ui;

  const currentWorkspaceName =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.name ?? "Workspace";
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ??
    (selectedProjectId != null && entry.project_name
      ? { color: entry.project_color ?? "", id: selectedProjectId, name: entry.project_name }
      : null);
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const descriptionMode = resolveDescriptionMode(description);
  const descriptionQuery = description.slice(1).trim().toLowerCase();
  const position = resolveEditorPosition(anchor, picker);

  const filteredProjects = (() => {
    const query =
      picker === "project"
        ? ui.search.trim().toLowerCase()
        : descriptionMode === "project"
          ? descriptionQuery
          : ui.search.trim().toLowerCase();
    if (!query) {
      return projects;
    }
    return projects.filter((project) => {
      const haystack = `${project.name} ${project.clientName ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  })();

  const filteredTags = (() => {
    const query =
      picker === "tag"
        ? ui.search.trim().toLowerCase()
        : descriptionMode === "tag"
          ? descriptionQuery
          : ui.search.trim().toLowerCase();
    if (!query) {
      return tags;
    }
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  })();

  const suggestionEntries = buildSuggestionEntries(recentEntries);

  useEditorKeyboard(ui, dispatch, onClose, isDirty);
  useEditorSideEffects(ui, dispatch, onClose, isDirty, description, descriptionMode);

  const contextValue: EditorContextValue = {
    currentWorkspaceId,
    currentWorkspaceName,
    description,
    durationFormat,
    entry,
    projects,
    recentEntries,
    selectedProjectId,
    selectedProject,
    selectedTagIds,
    selectedTags,
    selectedTaskName,
    tags,
    tasks,
    timeofdayFormat,
    timezone,
    workspaces,
    isCreatingProject,
    isCreatingTag,
    isDeleting,
    isDirty,
    isNewEntry,
    isPrimaryActionPending,
    isSaving,
    primaryActionIcon,
    primaryActionLabel,
    saveError,
    onBillableToggle,
    onClose,
    onCreateProject,
    onCreateTag,
    onDelete,
    onDescriptionChange,
    onDiscard,
    onDuplicate,
    onFavorite,
    onPrimaryAction,
    onProjectSelect,
    onSave,
    onSplit,
    onStartTimeChange,
    onStopTimeChange,
    onSuggestionEntrySelect,
    onTagToggle,
    onTaskSelect,
    onWorkspaceSelect,
    ui,
    dispatch,
  };

  return (
    <EditorContextProvider value={contextValue}>
      <div
        className="absolute z-40 w-[440px] overflow-visible rounded-[14px] border border-[var(--track-overlay-border-strong)] bg-[var(--track-overlay-surface)] px-5 pb-4 pt-4 shadow-[0_12px_28px_var(--track-shadow-overlay)]"
        data-testid="time-entry-editor-dialog"
        role="dialog"
        aria-modal="false"
        aria-labelledby="time-entry-editor-title"
        style={position}
      >
        <EditorHeader />

        <div className="mt-5">
          <EditorDescriptionField
            descriptionMode={descriptionMode}
            filteredProjects={filteredProjects}
            filteredTags={filteredTags}
            suggestionEntries={suggestionEntries}
          />

          <EditorPickerBar filteredTags={filteredTags} />

          <EditorTimeRow />
        </div>

        <EditorDiscardConfirmation />
      </div>
    </EditorContextProvider>
  );
}
