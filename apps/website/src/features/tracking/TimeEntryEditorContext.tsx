import { type Dispatch, createContext, useContext } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import type { EditorUIAction, EditorUIState } from "./useEditorUIState.ts";
import type { DurationFormat, TimeFormat } from "./overview-data.ts";
import type { ProjectPickerTask } from "./bulk-edit-pickers.tsx";
import type {
  TimeEntryEditorProject,
  TimeEntryEditorTag,
  TimeEntryEditorWorkspace,
} from "./time-entry-editor-types.ts";

export type EditorContextValue = {
  // Data
  currentWorkspaceId: number;
  currentWorkspaceName: string;
  description: string;
  durationFormat: DurationFormat;
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  projects: TimeEntryEditorProject[];
  recentEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  selectedProjectId: number | null | undefined;
  selectedProject: TimeEntryEditorProject | null;
  selectedTagIds: number[];
  selectedTags: TimeEntryEditorTag[];
  selectedTaskName: string | null | undefined;
  tags: TimeEntryEditorTag[];
  tasks: ProjectPickerTask[] | undefined;
  timeofdayFormat: TimeFormat;
  timezone: string;
  workspaces: TimeEntryEditorWorkspace[];

  // Flags
  isCreatingProject: boolean;
  isCreatingTag: boolean;
  isDeleting: boolean;
  isDirty: boolean;
  isNewEntry: boolean;
  isPrimaryActionPending: boolean;
  isSaving: boolean;
  primaryActionIcon: "play" | "stop";
  primaryActionLabel: string;
  saveError: string | null | undefined;

  // Callbacks
  onBillableToggle: (() => void) | undefined;
  onClose: () => void;
  onCreateProject: (name: string, color?: string) => Promise<void> | void;
  onCreateTag: (name: string) => Promise<void> | void;
  onDelete: (() => Promise<void> | void) | undefined;
  onDescriptionChange: (value: string) => void;
  onDiscard: (() => void) | undefined;
  onDuplicate: (() => Promise<void> | void) | undefined;
  onFavorite: (() => Promise<void> | void) | undefined;
  onPrimaryAction: (() => void) | undefined;
  onProjectSelect: (projectId: number | null) => void;
  onSave: () => Promise<void> | void;
  onSplit: (() => Promise<void> | void) | undefined;
  onStartTimeChange: (time: Date) => void;
  onStopTimeChange: (time: Date) => void;
  onSuggestionEntrySelect:
    | ((entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void)
    | undefined;
  onTagToggle: (tagId: number) => void;
  onTaskSelect: ((projectId: number, taskId: number) => void) | undefined;
  onWorkspaceSelect: (workspaceId: number) => void;

  // UI state
  ui: EditorUIState;
  dispatch: Dispatch<EditorUIAction>;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorContextProvider = EditorContext.Provider;

export function useEditorContext(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditorContext must be used within EditorContextProvider");
  }
  return ctx;
}
