import {
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { CalendarPanel } from "./CalendarPanel.tsx";
import {
  formatClockDuration,
  formatClockTime,
  resolveEntryDurationSeconds,
} from "./overview-data.ts";
import { TrackingIcon } from "./tracking-icons.tsx";

export type TimeEntryEditorAnchor = {
  containerHeight?: number;
  containerWidth?: number;
  height: number;
  left: number;
  preferredPlacement?: "left" | "right";
  top: number;
  width: number;
};

export type TimeEntryEditorProject = {
  clientName?: string;
  color: string;
  id: number;
  name: string;
};

export type TimeEntryEditorTag = {
  id: number;
  name: string;
};

export type TimeEntryEditorWorkspace = {
  id: number;
  isCurrent?: boolean;
  name: string;
};

type TimeEntryEditorDialogProps = {
  anchor: TimeEntryEditorAnchor;
  currentWorkspaceId: number;
  description: string;
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  isCreatingProject: boolean;
  isCreatingTag: boolean;
  isDeleting?: boolean;
  isDirty?: boolean;
  isPrimaryActionPending: boolean;
  isSaving: boolean;
  onClose: () => void;
  onCreateProject: (name: string) => Promise<void> | void;
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
  onWorkspaceSelect: (workspaceId: number) => void;
  primaryActionIcon: "play" | "stop";
  primaryActionLabel: string;
  projects: TimeEntryEditorProject[];
  recentEntries?: GithubComTogglTogglApiInternalModelsTimeEntry[];
  saveError?: string | null;
  selectedProjectId?: number | null;
  selectedTagIds: number[];
  tags: TimeEntryEditorTag[];
  timezone: string;
  workspaces: TimeEntryEditorWorkspace[];
};

export function TimeEntryEditorDialog({
  anchor,
  currentWorkspaceId,
  description,
  entry,
  isCreatingProject,
  isCreatingTag,
  isDeleting = false,
  isDirty = false,
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
  onWorkspaceSelect,
  primaryActionIcon,
  primaryActionLabel,
  projects,
  recentEntries = [],
  saveError,
  selectedProjectId,
  selectedTagIds,
  tags,
  timezone,
  workspaces,
}: TimeEntryEditorDialogProps): ReactElement {
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [picker, setPicker] = useState<"project" | "tag" | null>(null);
  const [timePicker, setTimePicker] = useState<"start" | "stop" | null>(null);
  const [timeEditor, setTimeEditor] = useState<"start" | "stop" | null>(null);
  const [projectComposerOpen, setProjectComposerOpen] = useState(false);
  const [projectDraftName, setProjectDraftName] = useState("");
  const [tagComposerOpen, setTagComposerOpen] = useState(false);
  const [tagDraftName, setTagDraftName] = useState("");
  const [search, setSearch] = useState("");
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
  const [descriptionSuggestionsOpen, setDescriptionSuggestionsOpen] = useState(false);
  const startIso = entry.start ?? entry.at ?? new Date().toISOString();
  const stopIso = entry.stop ?? null;
  const start = new Date(startIso);
  const stop = stopIso ? new Date(stopIso) : null;
  const duration = formatClockDuration(resolveEntryDurationSeconds(entry));
  const position = useMemo(() => resolveEditorPosition(anchor, picker), [anchor, picker]);
  const startDatePickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const stopDatePickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const currentWorkspaceName =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.name ?? "Workspace";
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [selectedTagIds, tags],
  );
  const descriptionMode = useMemo(() => resolveDescriptionMode(description), [description]);
  const descriptionQuery = useMemo(() => description.slice(1).trim().toLowerCase(), [description]);
  const filteredProjects = useMemo(() => {
    const query =
      picker === "project"
        ? search.trim().toLowerCase()
        : descriptionMode === "project"
          ? descriptionQuery
          : search.trim().toLowerCase();
    if (!query) {
      return projects;
    }

    return projects.filter((project) => {
      const haystack = `${project.name} ${project.clientName ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [descriptionMode, descriptionQuery, picker, projects, search]);
  const filteredTags = useMemo(() => {
    const query =
      picker === "tag"
        ? search.trim().toLowerCase()
        : descriptionMode === "tag"
          ? descriptionQuery
          : search.trim().toLowerCase();
    if (!query) {
      return tags;
    }

    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [descriptionMode, descriptionQuery, picker, search, tags]);
  const suggestionEntries = useMemo(() => buildSuggestionEntries(recentEntries), [recentEntries]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (showDiscardConfirmation) {
          setShowDiscardConfirmation(false);
          return;
        }
        if (isDirty) {
          setShowDiscardConfirmation(true);
          return;
        }
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, isDirty, showDiscardConfirmation]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        !target.closest('[data-testid="time-entry-editor-dialog"]') &&
        !target.closest('[data-testid="time-entry-editor-start-date-picker"]') &&
        !target.closest('[data-testid="time-entry-editor-stop-date-picker"]')
      ) {
        if (isDirty) {
          setShowDiscardConfirmation(true);
          return;
        }
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClose, isDirty]);

  useEffect(() => {
    if (picker !== "project") {
      setProjectComposerOpen(false);
      setProjectDraftName("");
      setWorkspaceMenuOpen(false);
    }

    if (picker !== "tag") {
      setTagComposerOpen(false);
      setTagDraftName("");
    }

    if (picker == null) {
      setSearch("");
    }

    if (picker !== null) {
      setTimePicker(null);
      setTimeEditor(null);
      setActionsMenuOpen(false);
    }
  }, [picker]);

  useEffect(() => {
    if (descriptionMode === "project") {
      setPicker(null);
      setDescriptionSuggestionsOpen(true);
      return;
    }

    if (descriptionMode === "tag") {
      setPicker(null);
      setDescriptionSuggestionsOpen(true);
      return;
    }

    if (descriptionMode === "billable") {
      setDescriptionSuggestionsOpen(true);
      setPicker(null);
      return;
    }

    if (!description.trim()) {
      setDescriptionSuggestionsOpen(true);
      return;
    }

    setDescriptionSuggestionsOpen(false);
  }, [description, descriptionMode]);

  useEffect(() => {
    if (timeEditor != null || timePicker != null) {
      setDescriptionSuggestionsOpen(false);
    }
  }, [timeEditor, timePicker]);

  useEffect(() => {
    if (timeEditor != null) {
      setTimePicker(null);
    }
  }, [timeEditor]);

  function applyEditedTime(target: "start" | "stop", value: string) {
    const baseDate = target === "start" ? start : stop;
    if (!baseDate) {
      return;
    }

    const nextDate = applyTimeInputValue(baseDate, value, timezone);
    if (!nextDate) {
      return;
    }

    if (target === "start") {
      onStartTimeChange(nextDate);
      return;
    }

    onStopTimeChange(nextDate);
  }

  const canDuplicate = stop != null && onDuplicate != null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40"
      data-testid="time-entry-editor-layer"
    >
      <div
        className="pointer-events-auto absolute max-h-[calc(100vh-32px)] w-[440px] overflow-visible rounded-[14px] border border-[#3f3f44] bg-[#1f1f20] px-5 pb-4 pt-4 shadow-[0_12px_28px_rgba(0,0,0,0.34)]"
        data-testid="time-entry-editor-dialog"
        role="dialog"
        aria-modal="false"
        aria-labelledby="time-entry-editor-title"
        style={position}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex items-center gap-3">
            <button
              aria-label={
                primaryActionLabel === "Continue Time Entry" ? "Continue entry" : primaryActionLabel
              }
              data-testid="time-entry-editor-primary-action"
              className="flex size-8 items-center justify-center rounded-full bg-[#523732] text-[#ff7a66] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!onPrimaryAction || isPrimaryActionPending}
              onClick={onPrimaryAction}
              type="button"
            >
              <TrackingIcon className="size-4" name={primaryActionIcon} />
            </button>
            {canDuplicate ? (
              <button
                aria-label="Duplicate entry"
                className="flex size-8 items-center justify-center rounded-full text-[#ededf0] transition hover:bg-white/6"
                disabled={isDirty}
                onClick={() => {
                  void onDuplicate?.();
                }}
                type="button"
              >
                <TrackingIcon className="size-4" name="copy" />
              </button>
            ) : null}
            <button
              aria-label="Entry actions"
              className="flex size-8 items-center justify-center rounded-full text-[#ededf0] transition hover:bg-white/6"
              onClick={() => setActionsMenuOpen((current) => !current)}
              type="button"
            >
              <TrackingIcon className="size-4" name="more" />
            </button>
            {actionsMenuOpen ? (
              <div className="absolute left-0 top-11 z-20 min-w-[220px] rounded-[12px] border border-[#3d3d42] bg-[#242426] p-1.5 shadow-[0_16px_32px_rgba(0,0,0,0.34)]">
                <ActionMenuButton
                  disabled={!onSplit}
                  label="Split"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    void onSplit?.();
                  }}
                />
                <ActionMenuButton
                  disabled={!onFavorite}
                  label="Pin as favorite"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    void onFavorite?.();
                  }}
                />
                {selectedProjectId ? (
                  <a
                    className="flex w-full items-center rounded-[10px] px-3 py-2.5 text-left text-[14px] font-medium text-[#d8d8dc] transition hover:bg-white/4"
                    href={`/projects/${currentWorkspaceId}/list`}
                    onClick={() => setActionsMenuOpen(false)}
                  >
                    Go to project
                  </a>
                ) : null}
                <ActionMenuButton
                  label="Copy start link"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    void copyToClipboard(
                      typeof window === "undefined"
                        ? (entry.start ?? "")
                        : `${window.location.origin}/timer?entry=${entry.id ?? ""}&start=${entry.start ?? ""}`,
                    );
                  }}
                />
                {description.trim() ? (
                  <ActionMenuButton
                    label="Copy description"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      void copyToClipboard(description.trim());
                    }}
                  />
                ) : null}
                <button
                  aria-label="Delete entry"
                  className="flex w-full items-center rounded-[10px] px-3 py-2.5 text-left text-[14px] font-medium text-[#ffb4aa] transition hover:bg-white/4 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!onDelete || isDeleting}
                  onClick={() => {
                    setActionsMenuOpen(false);
                    void onDelete?.();
                  }}
                  type="button"
                >
                  {isDeleting ? "Deleting..." : "Delete entry"}
                </button>
              </div>
            ) : null}
          </div>
          <button
            aria-label="Close editor"
            className="flex size-7 items-center justify-center rounded-full text-[20px] leading-none text-[#b9b9be] transition hover:bg-white/6 hover:text-white"
            onClick={() => {
              if (isDirty) {
                setShowDiscardConfirmation(true);
                return;
              }
              onClose();
            }}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-7">
          <div
            className="absolute right-5 top-[88px] z-0 h-0 w-[140px]"
            data-testid={timeEditor != null ? "time-entry-editor-active-time-edit" : undefined}
          />
          <label className="block">
            <span className="sr-only">Time entry description</span>
            <input
              aria-label="Time entry description"
              className="w-full bg-transparent text-[18px] font-semibold tracking-tight text-white outline-none placeholder:text-[#8f8f95]"
              id="time-entry-editor-title"
              onBlur={() => {
                window.setTimeout(() => setDescriptionSuggestionsOpen(false), 120);
              }}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onDescriptionChange(event.target.value)
              }
              onFocus={() => setDescriptionSuggestionsOpen(true)}
              placeholder="Add a description"
              value={description}
            />
          </label>
          {descriptionSuggestionsOpen &&
          descriptionMode !== "default" &&
          !timeEditor &&
          timePicker == null ? (
            <DescriptionSuggestionsSurface
              currentWorkspaceName={currentWorkspaceName}
              entryDescription={description}
              entryMode={descriptionMode}
              onBillableToggle={() => {
                onBillableToggle?.();
                if (descriptionMode === "billable") {
                  onDescriptionChange("");
                }
                setDescriptionSuggestionsOpen(false);
              }}
              onProjectSelect={(projectId) => {
                onProjectSelect(projectId);
                if (descriptionMode === "project") {
                  onDescriptionChange("");
                }
                setDescriptionSuggestionsOpen(false);
              }}
              onSuggestionEntrySelect={(suggestion) => {
                onSuggestionEntrySelect?.(suggestion);
                setDescriptionSuggestionsOpen(false);
              }}
              onTagSelect={(tagId) => {
                onTagToggle(tagId);
                if (descriptionMode === "tag") {
                  onDescriptionChange("");
                }
                setDescriptionSuggestionsOpen(false);
              }}
              projects={filteredProjects}
              suggestionEntries={suggestionEntries}
              tags={filteredTags}
            />
          ) : null}

          <div className="relative mt-5">
            <div className="flex items-center gap-4 text-[#a9a9ae]">
              <PickerButton
                active={picker === "project"}
                ariaLabel="Select project"
                icon="projects"
                label={selectedProject?.name}
                onClick={() => {
                  setSearch("");
                  setPicker((current) => (current === "project" ? null : "project"));
                }}
                toneColor={selectedProject?.color}
                variant={selectedProject ? "project" : "icon"}
              />
              <PickerButton
                active={picker === "tag"}
                ariaLabel="Select tags"
                icon="tags"
                label={resolveTagTriggerLabel(selectedTags)}
                onClick={() => {
                  setSearch("");
                  setPicker((current) => (current === "tag" ? null : "tag"));
                }}
                toneColor="#d58ad4"
                variant={selectedTags.length > 0 ? "tag" : "icon"}
              />
              <PickerButton
                active={entry.billable === true}
                ariaLabel="Billable"
                icon="dollar"
                onClick={onBillableToggle}
              />
            </div>

            {picker === "project" ? (
              <PickerSurface
                action={
                  <button
                    className="text-[14px] font-medium text-white"
                    onClick={() => setWorkspaceMenuOpen((current) => !current)}
                    type="button"
                  >
                    Change &rsaquo;
                  </button>
                }
                icon="projects"
                title={currentWorkspaceName}
              >
                {workspaceMenuOpen ? (
                  <div className="px-4 pb-2">
                    <div className="rounded-[10px] border border-[#3d3d42] bg-[#242426] py-2 shadow-[0_16px_32px_rgba(0,0,0,0.32)]">
                      {workspaces.map((workspace) => (
                        <button
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[14px] transition hover:bg-white/4 ${
                            workspace.id === currentWorkspaceId ? "text-white" : "text-[#c9c9ce]"
                          }`}
                          key={workspace.id}
                          onClick={() => {
                            onWorkspaceSelect(workspace.id);
                            setWorkspaceMenuOpen(false);
                            setPicker(null);
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
                  </div>
                ) : null}
                <SearchField
                  placeholder="Search by project, task or client"
                  value={search}
                  onChange={setSearch}
                />
                <button
                  className="flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-left text-[16px] text-[#d8d8dc] transition hover:bg-white/4"
                  onClick={() => {
                    onProjectSelect(null);
                    setPicker(null);
                  }}
                  type="button"
                >
                  <TrackingIcon className="size-5 text-[#b8b8bc]" name="projects" />
                  <span>No Project</span>
                </button>
                <div className="px-4 pt-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a8a90]">
                  Projects
                </div>
                <div className="max-h-[340px] overflow-y-auto px-1 py-2">
                  {filteredProjects.map((project) => (
                    <button
                      className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition hover:bg-white/4"
                      key={project.id}
                      onClick={() => {
                        onProjectSelect(project.id);
                        setPicker(null);
                      }}
                      type="button"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-[16px] font-medium text-white">
                          {project.name}
                        </div>
                        <div className="truncate text-[12px] text-[#8f8f95]">
                          {project.clientName || "No client"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {projectComposerOpen ? (
                  <form
                    className="border-t border-white/6 px-4 pb-1 pt-3"
                    onSubmit={(event) => {
                      void (async () => {
                        event.preventDefault();
                        const trimmed = projectDraftName.trim();
                        if (!trimmed || isCreatingProject) {
                          return;
                        }
                        await onCreateProject(trimmed);
                        setProjectDraftName("");
                        setProjectComposerOpen(false);
                        setSearch("");
                      })();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        className="h-10 flex-1 rounded-[10px] border border-[#5d5d62] bg-[#262628] px-3 text-[14px] text-white outline-none placeholder:text-[#909096]"
                        onChange={(event) => setProjectDraftName(event.target.value)}
                        placeholder="Project name"
                        value={projectDraftName}
                      />
                      <button
                        className="rounded-[10px] bg-[#c67abc] px-4 py-2.5 text-[13px] font-semibold text-[#241d24] disabled:opacity-60"
                        disabled={isCreatingProject || projectDraftName.trim().length === 0}
                        type="submit"
                      >
                        {isCreatingProject ? "Creating..." : "Create"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="border-t border-white/6 px-4 pb-1 pt-3">
                    <button
                      className="flex items-center gap-3 text-[15px] font-medium text-[#e8d4e6]"
                      onClick={() => {
                        setProjectDraftName(search.trim());
                        setProjectComposerOpen(true);
                      }}
                      type="button"
                    >
                      <span className="text-[22px] leading-none">+</span>
                      <span>Create a new project</span>
                    </button>
                  </div>
                )}
              </PickerSurface>
            ) : null}

            {picker === "tag" ? (
              <PickerSurface icon="tags" title="Tags">
                <SearchField placeholder="Search tags" value={search} onChange={setSearch} />
                <div className="max-h-[340px] overflow-y-auto px-1 py-2">
                  {filteredTags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);

                    return (
                      <button
                        className={`flex w-full items-center justify-between rounded-[10px] px-4 py-3 text-left transition ${
                          selected ? "bg-[#3f3040] text-white" : "hover:bg-white/4 text-[#d8d8dc]"
                        }`}
                        key={tag.id}
                        onClick={() => onTagToggle(tag.id)}
                        type="button"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <TrackingIcon className="size-4 shrink-0 text-[#cf8dcc]" name="tags" />
                          <span className="truncate text-[15px]">{tag.name}</span>
                        </div>
                        {selected ? (
                          <span className="text-[12px] text-[#efc2ea]">Selected</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {tagComposerOpen ? (
                  <form
                    className="border-t border-white/6 px-4 pb-1 pt-3"
                    onSubmit={(event) => {
                      void (async () => {
                        event.preventDefault();
                        const trimmed = tagDraftName.trim();
                        if (!trimmed || isCreatingTag) {
                          return;
                        }
                        await onCreateTag(trimmed);
                        setTagDraftName("");
                        setTagComposerOpen(false);
                        setSearch("");
                      })();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        className="h-10 flex-1 rounded-[10px] border border-[#5d5d62] bg-[#262628] px-3 text-[14px] text-white outline-none placeholder:text-[#909096]"
                        onChange={(event) => setTagDraftName(event.target.value)}
                        placeholder="Tag name"
                        value={tagDraftName}
                      />
                      <button
                        className="rounded-[10px] bg-[#c67abc] px-4 py-2.5 text-[13px] font-semibold text-[#241d24] disabled:opacity-60"
                        disabled={isCreatingTag || tagDraftName.trim().length === 0}
                        type="submit"
                      >
                        {isCreatingTag ? "Creating..." : "Create"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="border-t border-white/6 px-4 pb-1 pt-3">
                    <button
                      className="flex items-center gap-3 text-[15px] font-medium text-[#e8d4e6]"
                      onClick={() => {
                        setTagDraftName(search.trim());
                        setTagComposerOpen(true);
                      }}
                      type="button"
                    >
                      <span className="text-[22px] leading-none">+</span>
                      <span>Create a new tag</span>
                    </button>
                  </div>
                )}
              </PickerSurface>
            ) : null}
          </div>

          <div className="mt-5">
            <div className="relative flex min-w-0 items-start gap-4">
              <div className="relative min-w-0 overflow-visible">
                <div className="flex min-w-0 items-center gap-2.5">
                  <TimeDisplay
                    dialogRootTestId="time-entry-editor-dialog"
                    dateAriaLabel="Edit start date"
                    datePickerTriggerRef={startDatePickerTriggerRef}
                    editing={timeEditor === "start"}
                    onDateClick={() => {
                      setTimeEditor(null);
                      setTimePicker("start");
                    }}
                    onEditEnd={() => {
                      setTimeEditor(null);
                    }}
                    onEditStart={() => {
                      setTimePicker(null);
                      setTimeEditor("start");
                    }}
                    onTimeCommit={(value) => applyEditedTime("start", value)}
                    time={start}
                    timeAriaLabel="Edit start time"
                    timeValue={toTimeInputValue(start, timezone)}
                    timezone={timezone}
                  />
                  <span className="shrink-0 text-[22px] font-light text-[#a9a9ae]">→</span>
                  {stop ? (
                    <TimeDisplay
                      dialogRootTestId="time-entry-editor-dialog"
                      dateAriaLabel="Edit stop date"
                      datePickerTriggerRef={stopDatePickerTriggerRef}
                      editing={timeEditor === "stop"}
                      onDateClick={() => {
                        setTimeEditor(null);
                        setTimePicker("stop");
                      }}
                      onEditEnd={() => {
                        setTimeEditor(null);
                      }}
                      onEditStart={() => {
                        setTimePicker(null);
                        setTimeEditor("stop");
                      }}
                      onTimeCommit={(value) => applyEditedTime("stop", value)}
                      time={stop}
                      timeAriaLabel="Edit stop time"
                      timeValue={stop ? toTimeInputValue(stop, timezone) : ""}
                      timezone={timezone}
                    />
                  ) : (
                    <span className="shrink-0 text-[14px] font-semibold tabular-nums text-[#b7b7bc]">
                      Running
                    </span>
                  )}
                  <span className="min-w-0 truncate text-[13px] tabular-nums text-[#b7b7bc]">
                    {duration}
                  </span>
                </div>

                {timePicker &&
                (timePicker === "start"
                  ? startDatePickerTriggerRef.current
                  : stopDatePickerTriggerRef.current)
                  ? createPortal(
                      <div
                        className="absolute z-50"
                        style={{
                          left:
                            (timePicker === "start"
                              ? startDatePickerTriggerRef.current
                              : stopDatePickerTriggerRef.current
                            )?.getBoundingClientRect().left ?? 0,
                          top:
                            ((timePicker === "start"
                              ? startDatePickerTriggerRef.current
                              : stopDatePickerTriggerRef.current
                            )?.getBoundingClientRect().top ?? 0) +
                            ((timePicker === "start"
                              ? startDatePickerTriggerRef.current
                              : stopDatePickerTriggerRef.current
                            )?.getBoundingClientRect().height ?? 0) +
                            8,
                        }}
                      >
                        <CalendarPanel
                          date={timePicker === "start" ? start : stop!}
                          onClose={() => setTimePicker(null)}
                          onSelect={(nextDate) => {
                            if (timePicker === "start") {
                              onStartTimeChange(nextDate);
                            } else {
                              onStopTimeChange(nextDate);
                            }
                            setTimePicker(null);
                          }}
                          testId={`time-entry-editor-${timePicker}-date-picker`}
                        />
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
              <button
                className="shrink-0 rounded-[10px] bg-[#c67abc] px-6 py-2.5 text-[14px] font-semibold text-[#241d24] transition hover:bg-[#d38bca] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                onPointerDown={(event) => {
                  event.preventDefault();
                  if (!isSaving) {
                    void onSave();
                  }
                }}
                type="button"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {saveError ? <p className="mt-4 text-sm text-rose-300">{saveError}</p> : null}
        </div>

        {showDiscardConfirmation ? (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center rounded-[14px] bg-[rgba(15,15,16,0.82)] px-6"
            data-testid="time-entry-editor-discard-confirmation"
          >
            <div className="w-full max-w-[280px] rounded-[14px] border border-[#4a4a50] bg-[#242426] p-4 shadow-[0_16px_32px_rgba(0,0,0,0.38)]">
              <h3 className="text-[16px] font-semibold text-white">Discard changes?</h3>
              <p className="mt-2 text-[13px] text-[#c0c0c5]">
                You have unsaved changes in this time entry. Discard them before closing?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-[10px] border border-[#5d5d62] px-3 py-2 text-[13px] font-medium text-white transition hover:bg-white/4"
                  onClick={() => setShowDiscardConfirmation(false)}
                  type="button"
                >
                  Keep editing
                </button>
                <button
                  className="rounded-[10px] bg-[#ff7a66] px-3 py-2 text-[13px] font-semibold text-[#241d24] transition hover:brightness-110"
                  onClick={() => {
                    setShowDiscardConfirmation(false);
                    onDiscard?.();
                    onClose();
                  }}
                  type="button"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DescriptionSuggestionsSurface({
  currentWorkspaceName,
  entryDescription,
  entryMode,
  onBillableToggle,
  onProjectSelect,
  onSuggestionEntrySelect,
  onTagSelect,
  projects,
  suggestionEntries,
  tags,
}: {
  currentWorkspaceName: string;
  entryDescription: string;
  entryMode: "billable" | "default" | "project" | "tag";
  onBillableToggle?: () => void;
  onProjectSelect: (projectId: number) => void;
  onSuggestionEntrySelect: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onTagSelect: (tagId: number) => void;
  projects: TimeEntryEditorProject[];
  suggestionEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  tags: TimeEntryEditorTag[];
}) {
  return (
    <div className="absolute left-0 top-[calc(100%+12px)] z-20 w-[360px] rounded-[12px] border border-[#3d3d42] bg-[#1f1f20] py-3 shadow-[0_14px_32px_rgba(0,0,0,0.34)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 pb-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-white">{currentWorkspaceName}</p>
          <p className="text-[12px] text-[#8f8f95]">Change</p>
        </div>
      </div>
      {entryMode === "billable" ? (
        <div className="px-4 pt-3">
          <button
            className="flex w-full items-center justify-between rounded-[10px] px-3 py-3 text-left text-[14px] text-white transition hover:bg-white/4"
            onClick={onBillableToggle}
            type="button"
          >
            <span>Billable hours</span>
            <TrackingIcon className="size-4 text-[#d58ad4]" name="dollar" />
          </button>
        </div>
      ) : null}
      {(entryMode === "default" || entryDescription.trim().length === 0) &&
      suggestionEntries.length > 0 ? (
        <div className="px-4 pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a8a90]">
            Previously tracked time entries
          </p>
          <div className="mt-2 space-y-1">
            {suggestionEntries.map((suggestion) => (
              <button
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition hover:bg-white/4"
                key={buildSuggestionKey(suggestion)}
                onClick={() => onSuggestionEntrySelect(suggestion)}
                type="button"
              >
                <span className="truncate text-[14px] font-medium text-white">
                  {suggestion.description?.trim() || suggestion.project_name || "No description"}
                </span>
                <span className="truncate text-[12px] text-[#8f8f95]">
                  {suggestion.project_name || "No project"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {(entryMode === "default" || entryMode === "project") && projects.length > 0 ? (
        <div className="px-4 pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a8a90]">
            Projects
          </p>
          <div className="mt-2 space-y-1">
            {projects.map((project) => (
              <button
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition hover:bg-white/4"
                key={project.id}
                onClick={() => onProjectSelect(project.id)}
                type="button"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate text-[14px] font-medium text-white">{project.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {entryMode === "tag" ? (
        <div className="px-4 pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a8a90]">
            Tags
          </p>
          <div className="mt-2 space-y-1">
            {tags.map((tag) => (
              <button
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition hover:bg-white/4"
                key={tag.id}
                onClick={() => onTagSelect(tag.id)}
                type="button"
              >
                <TrackingIcon className="size-4 shrink-0 text-[#cf8dcc]" name="tags" />
                <span className="truncate text-[14px] font-medium text-white">{tag.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionMenuButton({
  disabled = false,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center rounded-[10px] px-3 py-2.5 text-left text-[14px] font-medium text-[#d8d8dc] transition hover:bg-white/4 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function PickerButton({
  active = false,
  ariaLabel,
  icon,
  label,
  onClick,
  toneColor,
  variant = "icon",
}: {
  active?: boolean;
  ariaLabel: string;
  icon: "dollar" | "projects" | "subscription" | "tags";
  label?: string;
  onClick?: () => void;
  toneColor?: string;
  variant?: "icon" | "project" | "tag";
}): ReactElement {
  const selected = Boolean(label);
  const color = toneColor ?? "#d58ad4";

  return (
    <button
      aria-label={ariaLabel}
      className={`flex items-center justify-center transition ${
        selected
          ? "h-10 max-w-[168px] gap-2 rounded-[14px] px-3 text-[14px] font-semibold"
          : "size-10 rounded-[12px]"
      } ${
        selected
          ? ""
          : active
            ? "bg-white/8 text-white"
            : "text-[#909096] hover:bg-white/5 hover:text-white"
      }`}
      onClick={onClick}
      style={selected ? { backgroundColor: colorToChipBackground(color), color } : undefined}
      type="button"
    >
      {variant === "project" && label ? (
        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        <TrackingIcon className={selected ? "size-5 shrink-0" : "size-5"} name={icon} />
      )}
      {label ? <span className="min-w-0 truncate">{label}</span> : null}
    </button>
  );
}

function PickerSurface({
  action,
  children,
  icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: "projects" | "tags";
  title: string;
}): ReactElement {
  return (
    <div className="absolute -left-2 top-8 z-10 w-[360px] rounded-[12px] border border-[#3d3d42] bg-[#1f1f20] py-3 shadow-[0_14px_32px_rgba(0,0,0,0.34)]">
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <TrackingIcon className="size-4 shrink-0 text-[#bdbdc2]" name={icon} />
          <span className="truncate text-[15px] font-semibold text-white">{title}</span>
        </div>
        {action ?? <span />}
      </div>
      {children}
    </div>
  );
}

function SearchField({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}): ReactElement {
  return (
    <label className="mx-4 mb-3 flex items-center gap-3 rounded-[10px] border border-[#5d5d62] bg-[#262628] px-4 py-2.5">
      <TrackingIcon className="size-4 shrink-0 text-[#a1a1a6]" name="search" />
      <input
        className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-[#909096]"
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function TimeDisplay({
  dialogRootTestId,
  dateAriaLabel,
  datePickerTriggerRef,
  editing,
  onDateClick,
  onEditEnd,
  onEditStart,
  onTimeCommit,
  time,
  timeAriaLabel,
  timeValue,
  timezone,
}: {
  dialogRootTestId?: string;
  dateAriaLabel: string;
  datePickerTriggerRef?: Ref<HTMLButtonElement | null>;
  editing: boolean;
  onDateClick: () => void;
  onEditEnd: () => void;
  onEditStart: () => void;
  onTimeCommit: (value: string) => void;
  time: Date;
  timeAriaLabel: string;
  timeValue: string;
  timezone: string;
}): ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState(timeValue);

  useEffect(() => {
    if (editing) {
      setDraft(timeValue);
    }
  }, [editing, timeValue]);

  return (
    <div className="flex items-center gap-1.5">
      {editing ? (
        <label className="block">
          <span className="sr-only">Edit time</span>
          <input
            aria-label="Edit time"
            autoFocus
            data-testid={dialogRootTestId ? `${dialogRootTestId}-time-input` : undefined}
            className="h-[42px] min-w-[110px] rounded-[10px] border border-[#c78acd] bg-[#262628] px-4 text-[14px] font-semibold tabular-nums text-white outline-none"
            value={draft}
            inputMode="numeric"
            onBlur={(event) => {
              onTimeCommit(event.currentTarget.value);
              onEditEnd();
            }}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onTimeCommit(inputRef.current?.value ?? draft);
                onEditEnd();
                return;
              }

              if (event.key === "Escape") {
                setDraft(timeValue);
                onEditEnd();
              }
            }}
            placeholder="HH:MM"
            ref={inputRef}
            spellCheck={false}
            type="text"
          />
        </label>
      ) : (
        <button
          aria-label={timeAriaLabel}
          className="flex min-w-[110px] items-center rounded-[10px] border border-[#606066] px-4 py-2.5 text-[14px] font-semibold tabular-nums text-white transition hover:border-[#8a8a90]"
          onClick={onEditStart}
          type="button"
        >
          <span>{formatClockTime(time, timezone)}</span>
        </button>
      )}
      <button
        aria-label={dateAriaLabel}
        className="flex size-[42px] items-center justify-center rounded-[10px] border border-[#606066] text-white transition hover:border-[#8a8a90]"
        onClick={onDateClick}
        ref={datePickerTriggerRef as React.LegacyRef<HTMLButtonElement>}
        type="button"
      >
        <TrackingIcon className="size-4 text-[#b9b9be]" name="calendar" />
      </button>
    </div>
  );
}

function toTimeInputValue(date: Date, timezone: string): string {
  const parts = getTimeZoneParts(date, timezone);
  const hours = String(parts.hours).padStart(2, "0");
  const minutes = String(parts.minutes).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function applyTimeInputValue(date: Date, value: string, timezone: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const currentParts = getTimeZoneParts(date, timezone);
  return buildDateInTimeZone(
    {
      day: currentParts.day,
      hours,
      minutes,
      month: currentParts.month,
      year: currentParts.year,
    },
    timezone,
  );
}

function getTimeZoneParts(
  date: Date,
  timezone: string,
): {
  day: number;
  hours: number;
  minutes: number;
  month: number;
  year: number;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
  const parts = formatter.formatToParts(date);

  return {
    day: Number(parts.find((part) => part.type === "day")?.value ?? "1"),
    hours: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minutes: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
    year: Number(parts.find((part) => part.type === "year")?.value ?? "1970"),
  };
}

function buildDateInTimeZone(
  parts: {
    day: number;
    hours: number;
    minutes: number;
    month: number;
    year: number;
  },
  timezone: string,
): Date {
  let candidate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes, 0, 0),
  );

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const resolved = getTimeZoneParts(candidate, timezone);
    const diffMinutes = resolvePartsDifferenceInMinutes(parts, resolved);
    if (diffMinutes === 0) {
      break;
    }
    candidate = new Date(candidate.getTime() + diffMinutes * 60_000);
  }

  return candidate;
}

function resolvePartsDifferenceInMinutes(
  target: {
    day: number;
    hours: number;
    minutes: number;
    month: number;
    year: number;
  },
  actual: {
    day: number;
    hours: number;
    minutes: number;
    month: number;
    year: number;
  },
): number {
  const targetUtc = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hours,
    target.minutes,
    0,
    0,
  );
  const actualUtc = Date.UTC(
    actual.year,
    actual.month - 1,
    actual.day,
    actual.hours,
    actual.minutes,
    0,
    0,
  );

  return Math.round((targetUtc - actualUtc) / 60_000);
}

function resolveDescriptionMode(value: string): "billable" | "default" | "project" | "tag" {
  if (value.startsWith("@")) {
    return "project";
  }

  if (value.startsWith("#")) {
    return "tag";
  }

  if (value.startsWith("$")) {
    return "billable";
  }

  return "default";
}

function buildSuggestionEntries(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
): GithubComTogglTogglApiInternalModelsTimeEntry[] {
  const seen = new Set<string>();
  const suggestions: GithubComTogglTogglApiInternalModelsTimeEntry[] = [];

  for (const entry of entries) {
    const key = buildSuggestionKey(entry);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    suggestions.push(entry);
    if (suggestions.length >= 6) {
      break;
    }
  }

  return suggestions;
}

function buildSuggestionKey(entry: GithubComTogglTogglApiInternalModelsTimeEntry): string {
  return [
    entry.description?.trim() ?? "",
    entry.project_id ?? entry.pid ?? "",
    (entry.tag_ids ?? []).join(","),
  ].join("::");
}

async function copyToClipboard(value: string): Promise<void> {
  if (!value || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return;
  }

  await navigator.clipboard.writeText(value);
}

function resolveEditorPosition(
  anchor: TimeEntryEditorAnchor,
  picker: "project" | "tag" | null,
): {
  left: number;
  top: number;
} {
  const cardWidth = picker ? 460 : 440;
  const cardHeight = picker ? 470 : 212;
  const padding = 16;
  const preferredLeft = anchor.left + anchor.width + 12;
  const fallbackLeft = anchor.left - cardWidth - 12;
  const containerWidth = anchor.containerWidth ?? preferredLeft + cardWidth + padding;
  const containerHeight = anchor.containerHeight ?? anchor.top + cardHeight + padding;
  const canPlaceRight = preferredLeft + cardWidth <= containerWidth - padding;
  const canPlaceLeft = fallbackLeft >= padding;
  const unclamped = (() => {
    if (anchor.preferredPlacement === "left" && canPlaceLeft) {
      return fallbackLeft;
    }
    if (anchor.preferredPlacement === "right" && canPlaceRight) {
      return preferredLeft;
    }
    if (canPlaceRight) {
      return preferredLeft;
    }
    if (canPlaceLeft) {
      return fallbackLeft;
    }
    return Math.max(padding, Math.min(containerWidth - cardWidth - padding, fallbackLeft));
  })();
  // Final clamp: ensure the dialog never exceeds the container right edge
  const left = Math.max(padding, Math.min(unclamped, containerWidth - cardWidth - padding));
  const top = Math.max(padding, Math.min(containerHeight - cardHeight - padding, anchor.top - 6));

  return { left, top };
}

function resolveTagTriggerLabel(tags: TimeEntryEditorTag[]): string | undefined {
  if (tags.length === 0) {
    return undefined;
  }

  if (tags.length === 1) {
    return tags[0]?.name;
  }

  return `${tags[0]?.name ?? "Tag"} +${tags.length - 1}`;
}

function colorToChipBackground(color: string): string {
  const normalized = color.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, 0.24)`;
}
