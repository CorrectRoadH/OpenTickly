import { type ChangeEvent, type ReactElement, useMemo, useState } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { formatClockTime } from "./overview-data.ts";
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

type TimeEntryEditorDialogProps = {
  anchor: TimeEntryEditorAnchor;
  description: string;
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  isSaving: boolean;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onProjectSelect: (projectId: number | null) => void;
  onSave: () => void;
  onTagToggle: (tagId: number) => void;
  projects: TimeEntryEditorProject[];
  saveError?: string | null;
  selectedProjectId?: number | null;
  selectedTagIds: number[];
  tags: TimeEntryEditorTag[];
  timezone: string;
  workspaceName: string;
};

export function TimeEntryEditorDialog({
  anchor,
  description,
  entry,
  isSaving,
  onClose,
  onDescriptionChange,
  onProjectSelect,
  onSave,
  onTagToggle,
  projects,
  saveError,
  selectedProjectId,
  selectedTagIds,
  tags,
  timezone,
  workspaceName,
}: TimeEntryEditorDialogProps): ReactElement {
  const [picker, setPicker] = useState<"project" | "tag" | null>(null);
  const [search, setSearch] = useState("");
  const start = new Date(entry.start ?? entry.at ?? Date.now());
  const stop = entry.stop ? new Date(entry.stop) : null;
  const position = useMemo(() => resolveEditorPosition(anchor), [anchor]);
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

  return (
    <div className="fixed inset-0 z-40 pointer-events-none" data-testid="time-entry-editor-layer">
      <div
        className="pointer-events-auto absolute w-[848px] rounded-[18px] border border-[#4a4a4a] bg-[#1f1f20] px-7 pb-6 pt-5 shadow-[0_16px_48px_rgba(0,0,0,0.42)]"
        data-testid="time-entry-editor-dialog"
        role="dialog"
        aria-modal="false"
        aria-labelledby="time-entry-editor-title"
        style={position}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#533531] text-[#ff7a66]">
              <TrackingIcon className="size-5" name={stop ? "stop" : "play"} />
            </span>
            <button
              aria-label="Entry actions"
              className="flex size-8 items-center justify-center rounded-full text-[#ededf0] transition hover:bg-white/6"
              type="button"
            >
              <TrackingIcon className="size-5" name="more" />
            </button>
          </div>
          <button
            aria-label="Close editor"
            className="text-[28px] leading-none text-[#bbbbc0] transition hover:text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-10">
          <label className="block">
            <span className="sr-only">Time entry description</span>
            <input
              className="w-full bg-transparent text-[38px] font-semibold tracking-tight text-white outline-none placeholder:text-[#8f8f95]"
              id="time-entry-editor-title"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onDescriptionChange(event.target.value)
              }
              placeholder="Add a description"
              value={description}
            />
          </label>

          <div className="relative mt-8">
            <div className="flex items-center gap-6 text-[#a9a9ae]">
              <PickerButton
                active={picker === "project" || selectedProjectId != null}
                ariaLabel="Select project"
                icon="projects"
                onClick={() => {
                  setSearch("");
                  setPicker((current) => (current === "project" ? null : "project"));
                }}
              />
              <PickerButton
                active={picker === "tag" || selectedTagIds.length > 0}
                ariaLabel="Select tags"
                icon="tags"
                onClick={() => {
                  setSearch("");
                  setPicker((current) => (current === "tag" ? null : "tag"));
                }}
              />
              <PickerButton
                active={entry.billable === true}
                ariaLabel="Billable"
                icon="subscription"
              />
            </div>

            {picker === "project" ? (
              <PickerSurface icon="projects" title={workspaceName}>
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
              </PickerSurface>
            ) : null}
          </div>

          <div className="mt-7 flex items-end justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="flex min-w-[208px] items-center justify-between gap-4 rounded-[16px] border border-[#66666b] px-6 py-4 text-[31px] font-semibold tabular-nums text-white">
                <span>{formatClockTime(start, timezone)}</span>
                <TrackingIcon className="size-5 text-[#b9b9be]" name="calendar" />
              </div>
              <span className="text-[36px] font-light text-[#a9a9ae]">→</span>
              <span className="text-[31px] font-semibold tabular-nums text-white">
                {stop ? formatClockTime(stop, timezone) : "Running"}
              </span>
            </div>
            <button
              className="rounded-[16px] bg-[#c67abc] px-16 py-4 text-[24px] font-semibold text-[#241d24] transition hover:bg-[#d38bca] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={onSave}
              type="button"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>

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
  onClick,
}: {
  active?: boolean;
  ariaLabel: string;
  icon: "projects" | "subscription" | "tags";
  onClick?: () => void;
}): ReactElement {
  return (
    <button
      aria-label={ariaLabel}
      className={`flex size-8 items-center justify-center rounded-[10px] transition ${
        active ? "bg-white/8 text-white" : "text-[#909096] hover:bg-white/5 hover:text-white"
      }`}
      onClick={onClick}
      type="button"
    >
      <TrackingIcon className="size-5" name={icon} />
    </button>
  );
}

function PickerSurface({
  children,
  icon,
  title,
}: {
  children: ReactElement | ReactElement[];
  icon: "projects" | "tags";
  title: string;
}): ReactElement {
  return (
    <div className="absolute left-0 top-12 z-10 w-[432px] rounded-[14px] border border-[#3d3d42] bg-[#1f1f20] py-3 shadow-[0_18px_42px_rgba(0,0,0,0.48)]">
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <TrackingIcon className="size-5 shrink-0 text-[#bdbdc2]" name={icon} />
          <span className="truncate text-[16px] font-semibold text-white">{title}</span>
        </div>
        <button className="text-[16px] font-medium text-white" type="button">
          Change &rsaquo;
        </button>
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
    <label className="mx-4 mb-3 flex items-center gap-3 rounded-[12px] border border-[#5d5d62] bg-[#262628] px-4 py-3">
      <TrackingIcon className="size-4 shrink-0 text-[#a1a1a6]" name="search" />
      <input
        className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#909096]"
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function resolveEditorPosition(anchor: TimeEntryEditorAnchor): {
  left: number;
  top: number;
} {
  if (typeof window === "undefined") {
    return {
      left: anchor.left,
      top: anchor.top,
    };
  }

  const cardWidth = 848;
  const padding = 16;
  const preferredRight = anchor.left + anchor.width + 12;
  const fallbackLeft = anchor.left - cardWidth + 32;
  const left =
    preferredRight + cardWidth <= window.innerWidth - padding
      ? preferredRight
      : Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, fallbackLeft));
  const top = Math.max(padding, Math.min(window.innerHeight - 360 - padding, anchor.top - 14));

  return { left, top };
}
