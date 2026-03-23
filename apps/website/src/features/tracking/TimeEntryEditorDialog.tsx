import {
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  formatClockDuration,
  formatClockTime,
  resolveEntryDurationSeconds,
} from "./overview-data.ts";
import { TrackingIcon } from "./tracking-icons.tsx";

export type TimeEntryEditorAnchor = {
  height: number;
  left: number;
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
  isPrimaryActionPending: boolean;
  isSaving: boolean;
  onClose: () => void;
  onCreateProject: (name: string) => Promise<void> | void;
  onCreateTag: (name: string) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onDescriptionChange: (value: string) => void;
  onPrimaryAction?: () => void;
  onProjectSelect: (projectId: number | null) => void;
  onSave: () => void;
  onStartTimeChange: (time: Date) => void;
  onStopTimeChange: (time: Date) => void;
  onTagToggle: (tagId: number) => void;
  onWorkspaceSelect: (workspaceId: number) => void;
  primaryActionIcon: "play" | "stop";
  primaryActionLabel: string;
  projects: TimeEntryEditorProject[];
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
  isPrimaryActionPending,
  isSaving,
  onClose,
  onCreateProject,
  onCreateTag,
  onDelete,
  onDescriptionChange,
  onPrimaryAction,
  onProjectSelect,
  onSave,
  onStartTimeChange,
  onStopTimeChange,
  onTagToggle,
  onWorkspaceSelect,
  primaryActionIcon,
  primaryActionLabel,
  projects,
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
  const [projectComposerOpen, setProjectComposerOpen] = useState(false);
  const [projectDraftName, setProjectDraftName] = useState("");
  const [tagComposerOpen, setTagComposerOpen] = useState(false);
  const [tagDraftName, setTagDraftName] = useState("");
  const [search, setSearch] = useState("");
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const start = new Date(entry.start ?? entry.at ?? Date.now());
  const stop = entry.stop ? new Date(entry.stop) : null;
  const duration = formatClockDuration(resolveEntryDurationSeconds(entry));
  const position = useMemo(() => resolveEditorPosition(anchor, picker), [anchor, picker]);
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
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return projects;
    }

    return projects.filter((project) => {
      const haystack = `${project.name} ${project.clientName ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [projects, search]);
  const filteredTags = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return tags;
    }

    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [search, tags]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

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
      setActionsMenuOpen(false);
    }
  }, [picker]);

  async function handleCopy() {
    const summary = buildCopySummary({
      description,
      projectName: selectedProject?.name ?? entry.project_name,
      start,
      stop,
      tagNames: selectedTags.map((tag) => tag.name),
      timezone,
    });

    await globalThis.navigator?.clipboard?.writeText(summary);
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none" data-testid="time-entry-editor-layer">
      <div
        className="pointer-events-auto absolute min-w-[356px] rounded-[14px] border border-[#3f3f44] bg-[#1f1f20] px-5 pb-4 pt-4 shadow-[0_12px_28px_rgba(0,0,0,0.34)]"
        data-testid="time-entry-editor-dialog"
        role="dialog"
        aria-modal="false"
        aria-labelledby="time-entry-editor-title"
        style={position}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex items-center gap-3">
            <button
              aria-label={primaryActionLabel}
              className="flex size-9 items-center justify-center rounded-full bg-[#523732] text-[#ff7a66] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!onPrimaryAction || isPrimaryActionPending}
              onClick={onPrimaryAction}
              type="button"
            >
              <TrackingIcon className="size-4" name={primaryActionIcon} />
            </button>
            <button
              aria-label="Copy entry"
              className="flex size-7 items-center justify-center rounded-full text-[#ededf0] transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void handleCopy();
              }}
              type="button"
            >
              <TrackingIcon className="size-4" name="copy" />
            </button>
            <button
              aria-label="Entry actions"
              className="flex size-7 items-center justify-center rounded-full text-[#ededf0] transition hover:bg-white/6"
              onClick={() => setActionsMenuOpen((current) => !current)}
              type="button"
            >
              <TrackingIcon className="size-4" name="more" />
            </button>
            {actionsMenuOpen ? (
              <div className="absolute left-0 top-11 z-20 min-w-[180px] rounded-[12px] border border-[#3d3d42] bg-[#242426] p-1.5 shadow-[0_16px_32px_rgba(0,0,0,0.34)]">
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
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-7">
          <label className="block">
            <span className="sr-only">Time entry description</span>
            <input
              className="w-full bg-transparent text-[18px] font-semibold tracking-tight text-white outline-none placeholder:text-[#8f8f95]"
              id="time-entry-editor-title"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onDescriptionChange(event.target.value)
              }
              placeholder="Add a description"
              value={description}
            />
          </label>

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

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <TimeDisplay
                  time={start}
                  timezone={timezone}
                  onClick={() => setTimePicker("start")}
                />
                <span className="shrink-0 text-[22px] font-light text-[#a9a9ae]">→</span>
                {stop ? (
                  <TimeDisplay
                    time={stop}
                    timezone={timezone}
                    onClick={() => setTimePicker("stop")}
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
            </div>
            <button
              className="rounded-[10px] bg-[#c67abc] px-6 py-2.5 text-[14px] font-semibold text-[#241d24] transition hover:bg-[#d38bca] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={onSave}
              type="button"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>

          {timePicker ? (
            <TimePicker
              time={timePicker === "start" ? start : stop!}
              onConfirm={(newTime) => {
                if (timePicker === "start") {
                  onStartTimeChange(newTime);
                } else {
                  onStopTimeChange(newTime);
                }
                setTimePicker(null);
              }}
              onClose={() => setTimePicker(null)}
            />
          ) : null}

          {saveError ? <p className="mt-4 text-sm text-rose-300">{saveError}</p> : null}
        </div>
      </div>
    </div>
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
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
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
  onClick,
  time,
  timezone,
}: {
  onClick: () => void;
  time: Date;
  timezone: string;
}): ReactElement {
  return (
    <button
      className="flex min-w-[110px] items-center justify-between gap-2 rounded-[10px] border border-[#606066] px-4 py-2.5 text-[14px] font-semibold tabular-nums text-white transition hover:border-[#8a8a90]"
      onClick={onClick}
      type="button"
    >
      <span>{formatClockTime(time, timezone)}</span>
      <TrackingIcon className="size-4 text-[#b9b9be]" name="calendar" />
    </button>
  );
}

function TimePicker({
  onClose,
  onConfirm,
  time,
}: {
  onClose: () => void;
  onConfirm: (time: Date) => void;
  time: Date;
}): ReactElement {
  const [hours, setHours] = useState(time.getHours());
  const [minutes, setMinutes] = useState(time.getMinutes());

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-testid="time-picker"]')) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClose]);

  const newTime = new Date(time);
  newTime.setHours(hours, minutes, 0, 0);

  return (
    <div
      className="absolute z-20 rounded-[12px] border border-[#3d3d42] bg-[#1f1f20] p-4 shadow-[0_14px_32px_rgba(0,0,0,0.34)]"
      data-testid="time-picker"
      style={{ top: "calc(100% + 8px)", left: 0 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <button
            className="size-8 rounded-full bg-white/8 text-white transition hover:bg-white/16"
            onClick={() => setHours((h) => (h + 1) % 24)}
            type="button"
          >
            +
          </button>
          <span className="w-12 py-2 text-center text-[24px] font-semibold tabular-nums text-white">
            {hours.toString().padStart(2, "0")}
          </span>
          <button
            className="size-8 rounded-full bg-white/8 text-white transition hover:bg-white/16"
            onClick={() => setHours((h) => (h - 1 + 24) % 24)}
            type="button"
          >
            −
          </button>
        </div>
        <span className="pb-6 text-[24px] font-light text-white">:</span>
        <div className="flex flex-col items-center">
          <button
            className="size-8 rounded-full bg-white/8 text-white transition hover:bg-white/16"
            onClick={() => setMinutes((m) => (m + 5) % 60)}
            type="button"
          >
            +
          </button>
          <span className="w-12 py-2 text-center text-[24px] font-semibold tabular-nums text-white">
            {minutes.toString().padStart(2, "0")}
          </span>
          <button
            className="size-8 rounded-full bg-white/8 text-white transition hover:bg-white/16"
            onClick={() => setMinutes((m) => (m - 5 + 60) % 60)}
            type="button"
          >
            −
          </button>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          className="rounded-[8px] px-4 py-2 text-[14px] font-medium text-[#c9c9ce] transition hover:bg-white/8"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-[8px] bg-[#c67abc] px-4 py-2 text-[14px] font-semibold text-[#241d24] transition hover:bg-[#d38bca]"
          onClick={() => onConfirm(newTime)}
          type="button"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

function resolveEditorPosition(
  anchor: TimeEntryEditorAnchor,
  picker: "project" | "tag" | null,
): {
  left: number;
  top: number;
} {
  if (typeof window === "undefined") {
    return {
      left: anchor.left,
      top: anchor.top,
    };
  }

  const cardWidth = picker ? 360 : 356;
  const cardHeight = picker ? 470 : 212;
  const padding = 16;
  const preferredLeft = anchor.left + anchor.width + 12;
  const fallbackLeft = anchor.left - cardWidth - 12;
  const left =
    preferredLeft + cardWidth <= window.innerWidth - padding
      ? preferredLeft
      : Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, fallbackLeft));
  const top = Math.max(
    padding,
    Math.min(window.innerHeight - cardHeight - padding, anchor.top - 6),
  );

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

function buildCopySummary({
  description,
  projectName,
  start,
  stop,
  tagNames,
  timezone,
}: {
  description: string;
  projectName?: string;
  start: Date;
  stop: Date | null;
  tagNames: string[];
  timezone: string;
}): string {
  return [
    description.trim() || "(no description)",
    projectName ? `Project: ${projectName}` : null,
    tagNames.length > 0 ? `Tags: ${tagNames.join(", ")}` : null,
    `Start: ${formatClockTime(start, timezone)}`,
    stop ? `Stop: ${formatClockTime(stop, timezone)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
