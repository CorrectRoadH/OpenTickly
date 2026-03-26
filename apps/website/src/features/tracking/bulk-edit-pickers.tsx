import type { ReactElement } from "react";

import type { TimeEntryEditorProject, TimeEntryEditorTag } from "./TimeEntryEditorDialog.tsx";
import { TrackingIcon } from "./tracking-icons.tsx";

export function ProjectPickerDropdown({
  filteredProjects,
  onSearch,
  onSelect,
  search,
  workspaceName,
}: {
  filteredProjects: TimeEntryEditorProject[];
  onSearch: (value: string) => void;
  onSelect: (id: number | null) => void;
  search: string;
  workspaceName: string;
}): ReactElement {
  return (
    <div
      className="absolute left-0 top-[calc(100%+4px)] z-20 w-full rounded-xl border border-[#3d3d42] bg-[#1f1f20] py-3 shadow-[0_14px_32px_rgba(0,0,0,0.34)]"
      data-testid="bulk-edit-project-picker"
    >
      <div className="flex items-center gap-3 px-4 pb-3">
        <TrackingIcon className="size-4 shrink-0 text-[#bdbdc2]" name="projects" />
        <span className="truncate text-[13px] font-semibold text-white">{workspaceName}</span>
      </div>
      <label className="mx-4 mb-3 flex items-center gap-3 rounded-lg border border-[#5d5d62] bg-[#262628] px-3 py-2">
        <TrackingIcon className="size-4 shrink-0 text-[#a1a1a6]" name="search" />
        <input
          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-[#909096]"
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by project, task or client"
          value={search}
        />
      </label>
      <button
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-[#d8d8dc] transition hover:bg-white/4"
        onClick={() => onSelect(null)}
        type="button"
      >
        <TrackingIcon className="size-4 text-[#b8b8bc]" name="projects" />
        <span>No Project</span>
      </button>
      <div className="max-h-[240px] overflow-y-auto px-1 py-1">
        {filteredProjects.map((project) => (
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/4"
            key={project.id}
            onClick={() => onSelect(project.id)}
            type="button"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-white">{project.name}</div>
              {project.clientName ? (
                <div className="truncate text-[11px] text-[#8f8f95]">{project.clientName}</div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TagPickerDropdown({
  filteredTags,
  onSearch,
  onToggle,
  search,
  selectedTagIds,
}: {
  filteredTags: TimeEntryEditorTag[];
  onSearch: (value: string) => void;
  onToggle: (id: number) => void;
  search: string;
  selectedTagIds: Set<number>;
}): ReactElement {
  return (
    <div
      className="absolute left-0 top-[calc(100%+4px)] z-20 w-full rounded-xl border border-[#3d3d42] bg-[#1f1f20] py-3 shadow-[0_14px_32px_rgba(0,0,0,0.34)]"
      data-testid="bulk-edit-tag-picker"
    >
      <label className="mx-4 mb-3 flex items-center gap-3 rounded-lg border border-[#5d5d62] bg-[#262628] px-3 py-2">
        <TrackingIcon className="size-4 shrink-0 text-[#a1a1a6]" name="search" />
        <input
          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-[#909096]"
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Add/filter tags"
          value={search}
        />
      </label>
      <div className="max-h-[240px] overflow-y-auto px-1 py-1">
        {filteredTags.map((tag) => {
          const checked = selectedTagIds.has(tag.id);
          return (
            <button
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[13px] transition ${
                checked ? "bg-[#3f3040] text-white" : "text-[#d8d8dc] hover:bg-white/4"
              }`}
              key={tag.id}
              onClick={() => onToggle(tag.id)}
              type="button"
            >
              <input
                checked={checked}
                className="size-3.5 cursor-pointer accent-[#e57bd9]"
                onChange={() => onToggle(tag.id)}
                type="checkbox"
              />
              <span className="truncate">{tag.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
