import type { ReactElement } from "react";

import { PickerDropdown } from "../../shared/ui/PickerDropdown.tsx";
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
    <PickerDropdown
      header={
        <div className="flex items-center gap-3">
          <TrackingIcon className="size-4 shrink-0 text-[#bdbdc2]" name="projects" />
          <span className="truncate text-[13px] font-semibold text-white">{workspaceName}</span>
        </div>
      }
      search={{ onChange: onSearch, placeholder: "Search by project, task or client", value: search }}
      testId="bulk-edit-project-picker"
    >
      <button
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-[#d8d8dc] transition hover:bg-white/4"
        onClick={() => onSelect(null)}
        type="button"
      >
        <TrackingIcon className="size-4 text-[#b8b8bc]" name="projects" />
        <span>No Project</span>
      </button>
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
    </PickerDropdown>
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
    <PickerDropdown
      search={{ onChange: onSearch, placeholder: "Add/filter tags", value: search }}
      testId="bulk-edit-tag-picker"
    >
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
    </PickerDropdown>
  );
}
