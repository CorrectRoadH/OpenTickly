import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../../shared/api/generated/public-track/types.gen.ts";
import {
  useCreateProjectMutation,
  useCreateTagMutation,
  useCreateTimeEntryMutation,
  useCreateWorkspaceFavoriteMutation,
} from "../../../shared/query/web-shell.ts";
import { resolveEntryDurationSeconds } from "../overview-data.ts";
import { resolveTimeEntryProjectId } from "../time-entry-ids.ts";
import type { TimeEntryEditorAnchor } from "../TimeEntryEditorDialog.tsx";
import { useWorkspaceContext } from "./WorkspaceContext.tsx";
import {
  areNumberListsEqual,
  isRunningTimeEntry,
  resolveSingleTimerErrorMessage,
  toTrackIso,
} from "./timer-page-utils.ts";

export interface SelectedEntryContextValue {
  selectedEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  setSelectedEntry: (entry: GithubComTogglTogglApiInternalModelsTimeEntry | null) => void;
  selectedEntryAnchor: TimeEntryEditorAnchor | null;
  setSelectedEntryAnchor: (anchor: TimeEntryEditorAnchor | null) => void;
  selectedDescription: string;
  setSelectedDescription: (desc: string) => void;
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  selectedTagIds: number[];
  setSelectedTagIds: (ids: number[] | ((prev: number[]) => number[])) => void;
  selectedEntryWorkspaceId: number;
  selectedEntryDirty: boolean;
  selectedEntryError: string | null;
  setSelectedEntryError: (error: string | null) => void;
  isNewEntry: boolean;
  calendarDraftEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;

  createProjectMutation: ReturnType<typeof useCreateProjectMutation>;
  createTagMutation: ReturnType<typeof useCreateTagMutation>;
  createTimeEntryMutation: ReturnType<typeof useCreateTimeEntryMutation>;
  createWorkspaceFavoriteMutation: ReturnType<typeof useCreateWorkspaceFavoriteMutation>;

  handleEntryEdit: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    anchorRect: DOMRect,
  ) => void;
  handleCalendarSlotCreate: (slot: { end: Date; start: Date }) => void;
  handleSelectedEntrySave: () => Promise<void>;
  handleSelectedEntryPrimaryAction: () => Promise<void>;
  handleSelectedEntryBillableToggle: () => void;
  handleSelectedEntryDelete: () => Promise<void>;
  handleSelectedEntryFavorite: () => Promise<void>;
  handleSelectedEntryDuplicate: () => Promise<void>;
  handleSelectedEntryProjectCreate: (name: string, color?: string) => Promise<void>;
  handleSelectedEntryTagCreate: (name: string) => Promise<void>;
  handleSelectedEntrySuggestionSelect: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  ) => void;
  handleSelectedEntrySplit: (splitAtMs?: number) => Promise<void>;
  handleSelectedEntryStartTimeChange: (time: Date) => void;
  handleSelectedEntryStopTimeChange: (time: Date) => void;
  closeSelectedEntryEditor: () => void;
}

const SelectedEntryCtx = createContext<SelectedEntryContextValue | null>(null);

export function SelectedEntryProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation("toast");
  const {
    workspaceId,
    startTimeEntryMutation,
    stopTimeEntryMutation,
    updateTimeEntryMutation,
    deleteTimeEntryMutation,
    switchWorkspace,
  } = useWorkspaceContext();
  const [selectedEntry, setSelectedEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);
  const [selectedEntryAnchor, setSelectedEntryAnchor] = useState<TimeEntryEditorAnchor | null>(
    null,
  );
  const [selectedDescription, setSelectedDescription] = useState("");
  const [selectedEntryError, setSelectedEntryError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedStartIso, setSelectedStartIso] = useState<string | null>(null);
  const [selectedStopIso, setSelectedStopIso] = useState<string | null>(null);
  const [isNewEntry, setIsNewEntry] = useState(false);
  const [calendarDraftEntry, setCalendarDraftEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);

  const selectedEntryIdRef = useRef<number | null>(null);

  const selectedEntryWorkspaceId = useMemo(() => {
    const entryWorkspaceId = selectedEntry?.workspace_id ?? selectedEntry?.wid;
    return typeof entryWorkspaceId === "number" ? entryWorkspaceId : workspaceId;
  }, [selectedEntry, workspaceId]);

  // Workspace-scoped mutations for the editor
  const createProjectMutation = useCreateProjectMutation(selectedEntryWorkspaceId);
  const createTagMutation = useCreateTagMutation(selectedEntryWorkspaceId);
  const createTimeEntryMutation = useCreateTimeEntryMutation(selectedEntryWorkspaceId);
  const createWorkspaceFavoriteMutation =
    useCreateWorkspaceFavoriteMutation(selectedEntryWorkspaceId);

  const selectedEntryDirty = useMemo(() => {
    if (!selectedEntry) return false;
    const originalProjectId = resolveTimeEntryProjectId(selectedEntry);
    const originalTagIds = selectedEntry.tag_ids ?? [];
    return (
      selectedDescription !== (selectedEntry.description ?? "") ||
      selectedProjectId !== originalProjectId ||
      !areNumberListsEqual(selectedTagIds, originalTagIds) ||
      selectedStartIso !== (selectedEntry.start ?? null) ||
      selectedStopIso !== (selectedEntry.stop ?? null)
    );
  }, [
    selectedDescription,
    selectedEntry,
    selectedProjectId,
    selectedStartIso,
    selectedStopIso,
    selectedTagIds,
  ]);

  // Initialize editor fields when a new entry is selected
  useEffect(() => {
    const entryId = selectedEntry?.id ?? null;
    if (entryId != null && entryId === selectedEntryIdRef.current) return;
    selectedEntryIdRef.current = entryId;
    setSelectedDescription(selectedEntry?.description ?? "");
    setSelectedProjectId(selectedEntry ? resolveTimeEntryProjectId(selectedEntry) : null);
    setSelectedTagIds(selectedEntry?.tag_ids ?? []);
    setSelectedStartIso(selectedEntry?.start ?? null);
    setSelectedStopIso(selectedEntry?.stop ?? null);
    setSelectedEntryError(null);
  }, [selectedEntry]);

  const closeSelectedEntryEditor = useCallback(() => {
    selectedEntryIdRef.current = null;
    setSelectedEntry(null);
    setSelectedEntryAnchor(null);
    setSelectedEntryError(null);
    setIsNewEntry(false);
    setCalendarDraftEntry(null);
  }, []);

  const handleEntryEdit = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => {
      const pageContainer = document.querySelector<HTMLElement>(
        '[data-testid="tracking-timer-page"]',
      );
      const pageRect = pageContainer?.getBoundingClientRect();
      const pageLeft = pageRect?.left ?? 0;
      const pageTop = (pageRect?.top ?? 0) + window.scrollY;
      const containerWidth = pageContainer?.clientWidth ?? window.innerWidth;
      const anchorLeft = anchorRect.left - pageLeft;
      const preferredPlacement = anchorLeft > containerWidth / 2 ? "left" : "right";
      setSelectedEntry(entry);
      setSelectedEntryAnchor({
        containerWidth,
        height: anchorRect.height,
        left: anchorLeft,
        preferredPlacement,
        top: anchorRect.top + window.scrollY - pageTop,
        width: anchorRect.width,
      });
    },
    [],
  );

  const handleCalendarSlotCreate = useCallback(
    (slot: { end: Date; start: Date }) => {
      if (selectedEntry != null) {
        closeSelectedEntryEditor();
        setCalendarDraftEntry(null);
        return;
      }
      const durationSeconds = Math.round((slot.end.getTime() - slot.start.getTime()) / 1000);
      const draftEntry: GithubComTogglTogglApiInternalModelsTimeEntry = {
        billable: false,
        description: "",
        duration: durationSeconds > 0 ? durationSeconds : 1800,
        start: toTrackIso(slot.start),
        stop: toTrackIso(slot.end),
        workspace_id: workspaceId,
        tag_ids: [],
      };
      setIsNewEntry(true);
      setCalendarDraftEntry(draftEntry);
      setSelectedEntry(draftEntry);
    },
    [selectedEntry, closeSelectedEntryEditor, workspaceId],
  );

  const handleSelectedEntrySave = useCallback(async () => {
    if (!selectedEntry) return;

    if (isNewEntry) {
      try {
        const durationSeconds = selectedEntry.duration ?? 1800;
        await createTimeEntryMutation.mutateAsync({
          billable: selectedEntry.billable,
          description: selectedDescription.trim(),
          duration: durationSeconds > 0 ? durationSeconds : 1800,
          projectId: selectedProjectId,
          start: selectedEntry.start ?? toTrackIso(new Date()),
          stop: selectedEntry.stop ?? toTrackIso(new Date()),
          tagIds: selectedTagIds,
          taskId: selectedEntry.task_id ?? selectedEntry.tid ?? null,
        });
        setSelectedEntryError(null);
        closeSelectedEntryEditor();
      } catch (error) {
        setSelectedEntryError(resolveSingleTimerErrorMessage(error));
      }
      return;
    }

    if (!selectedEntry.id) return;
    const selectedWorkspaceId = selectedEntry.workspace_id ?? selectedEntry.wid;
    if (typeof selectedWorkspaceId !== "number") {
      setSelectedEntryError("This time entry is missing a workspace and cannot be updated.");
      return;
    }
    setSelectedEntryError(null);
    closeSelectedEntryEditor();
    updateTimeEntryMutation.mutate(
      {
        request: {
          billable: selectedEntry.billable,
          description: selectedDescription.trim(),
          projectId: selectedProjectId,
          start: selectedEntry.start,
          stop: selectedEntry.stop,
          tagIds: selectedTagIds,
          taskId: selectedEntry.task_id ?? selectedEntry.tid,
        },
        timeEntryId: selectedEntry.id,
        workspaceId: selectedWorkspaceId,
      },
      {
        onSuccess: () => toast.success(t("timeEntrySaved")),
        onError: () => toast.error(t("failedToSaveTimeEntry")),
      },
    );
  }, [
    selectedEntry,
    selectedDescription,
    selectedProjectId,
    selectedTagIds,
    isNewEntry,
    createTimeEntryMutation,
    updateTimeEntryMutation,
    closeSelectedEntryEditor,
    t,
  ]);

  const handleSelectedEntryPrimaryAction = useCallback(async () => {
    if (!selectedEntry?.id) return;
    const selectedWorkspaceId = selectedEntry.workspace_id ?? selectedEntry.wid;
    if (typeof selectedWorkspaceId !== "number") {
      setSelectedEntryError("This time entry is missing a workspace.");
      return;
    }
    try {
      if (isRunningTimeEntry(selectedEntry)) {
        await stopTimeEntryMutation.mutateAsync({
          timeEntryId: selectedEntry.id,
          workspaceId: selectedWorkspaceId,
        });
        setSelectedEntryError(null);
        closeSelectedEntryEditor();
        return;
      }
      if (selectedWorkspaceId !== workspaceId) {
        switchWorkspace(selectedWorkspaceId);
        closeSelectedEntryEditor();
        return;
      }
      await startTimeEntryMutation.mutateAsync({
        billable: selectedEntry.billable,
        description: selectedDescription.trim() || (selectedEntry.description ?? ""),
        projectId: selectedProjectId,
        start: new Date().toISOString(),
        tagIds: selectedTagIds,
        taskId: selectedEntry.task_id ?? selectedEntry.tid ?? null,
      });
      closeSelectedEntryEditor();
    } catch (error) {
      setSelectedEntryError(resolveSingleTimerErrorMessage(error));
    }
  }, [
    selectedEntry,
    selectedDescription,
    selectedProjectId,
    selectedTagIds,
    workspaceId,
    switchWorkspace,
    startTimeEntryMutation,
    stopTimeEntryMutation,
    updateTimeEntryMutation,
    closeSelectedEntryEditor,
  ]);

  const handleSelectedEntryBillableToggle = useCallback(() => {
    setSelectedEntry((current) => {
      if (!current) return current;
      return { ...current, billable: current.billable !== true };
    });
  }, []);

  const handleSelectedEntryDelete = useCallback(async () => {
    if (!selectedEntry?.id) return;
    const selectedWorkspaceId = selectedEntry.workspace_id ?? selectedEntry.wid;
    if (typeof selectedWorkspaceId !== "number") {
      setSelectedEntryError("This time entry is missing a workspace.");
      return;
    }
    try {
      await deleteTimeEntryMutation.mutateAsync({
        timeEntryId: selectedEntry.id,
        workspaceId: selectedWorkspaceId,
      });
      setSelectedEntryError(null);
      closeSelectedEntryEditor();
    } catch (error) {
      setSelectedEntryError(resolveSingleTimerErrorMessage(error));
      throw error;
    }
  }, [selectedEntry, deleteTimeEntryMutation, closeSelectedEntryEditor]);

  const handleSelectedEntryDuplicate = useCallback(async () => {
    if (!selectedEntry?.id) return;
    const selectedWorkspaceId = selectedEntry.workspace_id ?? selectedEntry.wid;
    if (typeof selectedWorkspaceId !== "number") {
      setSelectedEntryError("This time entry is missing a workspace.");
      return;
    }
    if (isRunningTimeEntry(selectedEntry) || !selectedEntry.start || !selectedEntry.stop) {
      setSelectedEntryError("Only stopped time entries can be duplicated.");
      return;
    }
    try {
      await createTimeEntryMutation.mutateAsync({
        billable: selectedEntry.billable,
        description: selectedDescription.trim(),
        duration: resolveEntryDurationSeconds(selectedEntry),
        projectId: selectedProjectId,
        start: selectedEntry.start,
        stop: selectedEntry.stop,
        tagIds: selectedTagIds,
        taskId: selectedEntry.task_id ?? selectedEntry.tid ?? null,
      });
      setSelectedEntryError(null);
      closeSelectedEntryEditor();
    } catch (error) {
      setSelectedEntryError(resolveSingleTimerErrorMessage(error));
    }
  }, [
    selectedEntry,
    selectedDescription,
    selectedProjectId,
    selectedTagIds,
    createTimeEntryMutation,
    closeSelectedEntryEditor,
  ]);

  const handleSelectedEntryProjectCreate = useCallback(
    async (name: string, color?: string) => {
      try {
        const project = await createProjectMutation.mutateAsync({ color, name });
        setSelectedProjectId(project.id ?? null);
        setSelectedEntryError(null);
      } catch (error) {
        setSelectedEntryError(resolveSingleTimerErrorMessage(error));
        throw error;
      }
    },
    [createProjectMutation],
  );

  const handleSelectedEntryTagCreate = useCallback(
    async (name: string) => {
      try {
        await createTagMutation.mutateAsync(name);
        setSelectedEntryError(null);
      } catch (error) {
        setSelectedEntryError(resolveSingleTimerErrorMessage(error));
        throw error;
      }
    },
    [createTagMutation],
  );

  const handleSelectedEntrySuggestionSelect = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
      setSelectedDescription(entry.description ?? "");
      setSelectedProjectId(resolveTimeEntryProjectId(entry));
      setSelectedTagIds(entry.tag_ids ?? []);
    },
    [],
  );

  const handleSelectedEntrySplit = useCallback(
    async (splitAtMs?: number) => {
      if (!selectedEntry?.id || !selectedEntry.start || !selectedEntry.stop) {
        setSelectedEntryError("Only stopped time entries can be split.");
        return;
      }
      const selectedWorkspaceId = selectedEntry.workspace_id ?? selectedEntry.wid;
      if (typeof selectedWorkspaceId !== "number") {
        setSelectedEntryError("This time entry is missing a workspace.");
        return;
      }
      const startMs = new Date(selectedEntry.start).getTime();
      const stopMs = new Date(selectedEntry.stop).getTime();
      const resolvedSplitMs = splitAtMs ?? startMs + Math.floor((stopMs - startMs) / 2);
      if (
        !Number.isFinite(resolvedSplitMs) ||
        resolvedSplitMs <= startMs ||
        resolvedSplitMs >= stopMs
      ) {
        setSelectedEntryError("This time entry is too short to split.");
        return;
      }
      try {
        await updateTimeEntryMutation.mutateAsync({
          request: {
            billable: selectedEntry.billable,
            description: selectedDescription.trim(),
            projectId: selectedProjectId,
            start: selectedEntry.start,
            stop: new Date(resolvedSplitMs).toISOString(),
            tagIds: selectedTagIds,
            taskId: selectedEntry.task_id ?? selectedEntry.tid ?? null,
          },
          timeEntryId: selectedEntry.id,
          workspaceId: selectedWorkspaceId,
        });
        await createTimeEntryMutation.mutateAsync({
          billable: selectedEntry.billable,
          description: selectedDescription.trim(),
          duration: Math.round((stopMs - resolvedSplitMs) / 1000),
          projectId: selectedProjectId,
          start: new Date(resolvedSplitMs).toISOString(),
          stop: selectedEntry.stop,
          tagIds: selectedTagIds,
          taskId: selectedEntry.task_id ?? selectedEntry.tid ?? null,
        });
        setSelectedEntryError(null);
        closeSelectedEntryEditor();
      } catch (error) {
        setSelectedEntryError(resolveSingleTimerErrorMessage(error));
      }
    },
    [
      closeSelectedEntryEditor,
      createTimeEntryMutation,
      selectedDescription,
      selectedEntry,
      selectedProjectId,
      selectedTagIds,
      updateTimeEntryMutation,
    ],
  );

  const handleSelectedEntryFavorite = useCallback(async () => {
    try {
      await createWorkspaceFavoriteMutation.mutateAsync({
        billable: selectedEntry?.billable,
        description: selectedDescription.trim(),
        projectId: selectedProjectId,
        tagIds: selectedTagIds,
        taskId: selectedEntry?.task_id ?? selectedEntry?.tid ?? null,
      });
      setSelectedEntryError(null);
    } catch (error) {
      setSelectedEntryError(resolveSingleTimerErrorMessage(error));
    }
  }, [
    createWorkspaceFavoriteMutation,
    selectedDescription,
    selectedEntry,
    selectedProjectId,
    selectedTagIds,
  ]);

  const handleSelectedEntryStartTimeChange = useCallback((time: Date) => {
    const nextIso = time.toISOString();
    setSelectedStartIso(nextIso);
    setSelectedEntry((current) => {
      if (!current) return current;
      return { ...current, start: nextIso };
    });
  }, []);

  const handleSelectedEntryStopTimeChange = useCallback((time: Date) => {
    const nextIso = time.toISOString();
    setSelectedStopIso(nextIso);
    setSelectedEntry((current) => {
      if (!current) return current;
      return { ...current, stop: nextIso };
    });
  }, []);

  const value = useMemo<SelectedEntryContextValue>(
    () => ({
      selectedEntry,
      setSelectedEntry,
      selectedEntryAnchor,
      setSelectedEntryAnchor,
      selectedDescription,
      setSelectedDescription,
      selectedProjectId,
      setSelectedProjectId,
      selectedTagIds,
      setSelectedTagIds,
      selectedEntryWorkspaceId,
      selectedEntryDirty,
      selectedEntryError,
      setSelectedEntryError,
      isNewEntry,
      calendarDraftEntry,
      createProjectMutation,
      createTagMutation,
      createTimeEntryMutation,
      createWorkspaceFavoriteMutation,
      handleEntryEdit,
      handleCalendarSlotCreate,
      handleSelectedEntrySave,
      handleSelectedEntryPrimaryAction,
      handleSelectedEntryBillableToggle,
      handleSelectedEntryDelete,
      handleSelectedEntryFavorite,
      handleSelectedEntryDuplicate,
      handleSelectedEntryProjectCreate,
      handleSelectedEntryTagCreate,
      handleSelectedEntrySuggestionSelect,
      handleSelectedEntrySplit,
      handleSelectedEntryStartTimeChange,
      handleSelectedEntryStopTimeChange,
      closeSelectedEntryEditor,
    }),
    [
      selectedEntry,
      selectedEntryAnchor,
      selectedDescription,
      selectedProjectId,
      selectedTagIds,
      selectedEntryWorkspaceId,
      selectedEntryDirty,
      selectedEntryError,
      isNewEntry,
      calendarDraftEntry,
      createProjectMutation,
      createTagMutation,
      createTimeEntryMutation,
      createWorkspaceFavoriteMutation,
      handleEntryEdit,
      handleCalendarSlotCreate,
      handleSelectedEntrySave,
      handleSelectedEntryPrimaryAction,
      handleSelectedEntryBillableToggle,
      handleSelectedEntryDelete,
      handleSelectedEntryFavorite,
      handleSelectedEntryDuplicate,
      handleSelectedEntryProjectCreate,
      handleSelectedEntryTagCreate,
      handleSelectedEntrySuggestionSelect,
      handleSelectedEntrySplit,
      handleSelectedEntryStartTimeChange,
      handleSelectedEntryStopTimeChange,
      closeSelectedEntryEditor,
    ],
  );

  return <SelectedEntryCtx.Provider value={value}>{children}</SelectedEntryCtx.Provider>;
}

export function useSelectedEntryContext(): SelectedEntryContextValue {
  const ctx = useContext(SelectedEntryCtx);
  if (!ctx) {
    throw new Error("SelectedEntryProvider is required");
  }
  return ctx;
}
