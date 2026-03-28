import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";

import { ModalDialog } from "../../shared/ui/ModalDialog.tsx";
import { useFilteredList } from "../../shared/ui/useFilteredList.ts";
import type { TimeEntryEditorProject, TimeEntryEditorTag } from "./TimeEntryEditorDialog.tsx";
import { ProjectPickerDropdown, TagPickerDropdown } from "./bulk-edit-pickers.tsx";
import { ChevronDownIcon } from "../../shared/ui/icons.tsx";

export type BulkEditDialogProps = {
  count: number;
  onClose: () => void;
  onSave: (updates: BulkEditUpdates) => void;
  projects: TimeEntryEditorProject[];
  tags: TimeEntryEditorTag[];
  workspaceName: string;
};

export type BulkEditUpdates = {
  billable?: boolean;
  date?: string;
  description?: string;
  projectId?: number | null;
  removeExistingTags?: boolean;
  tagIds?: number[];
};

export function BulkEditDialog({
  count,
  onClose,
  onSave,
  projects,
  tags,
  workspaceName,
}: BulkEditDialogProps): ReactElement {
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(false);
  const [billableTouched, setBillableTouched] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectTouched, setProjectTouched] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [removeExistingTags, setRemoveExistingTags] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [picker, setPicker] = useState<"project" | "tag" | null>(null);
  const [search, setSearch] = useState("");

  const entryWord = count === 1 ? "time entry" : "time entries";

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const matchProject = useCallback(
    (p: TimeEntryEditorProject, q: string) =>
      `${p.name} ${p.clientName ?? ""}`.toLowerCase().includes(q),
    [],
  );
  const matchTag = useCallback(
    (t: TimeEntryEditorTag, q: string) => t.name.toLowerCase().includes(q),
    [],
  );
  const filteredProjects = useFilteredList(projects, search, matchProject);
  const filteredTags = useFilteredList(tags, search, matchTag);

  function handleSave() {
    const updates: BulkEditUpdates = {};
    if (description.trim()) updates.description = description.trim();
    if (projectTouched) updates.projectId = selectedProjectId;
    if (selectedTagIds.size > 0) updates.tagIds = [...selectedTagIds];
    if (removeExistingTags) updates.removeExistingTags = true;
    if (selectedDate) updates.date = selectedDate;
    if (billableTouched) updates.billable = billable;
    onSave(updates);
  }

  return (
    <ModalDialog
      onClose={onClose}
      testId="bulk-edit-dialog"
      title={`Bulk edit ${count} ${entryWord}`}
      width="max-w-[420px]"
    >
      <div className="flex flex-col gap-3">
        <input
          className="w-full rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2.5 text-[13px] text-white placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none"
          data-testid="bulk-edit-description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="New description..."
          type="text"
          value={description}
        />

        <div className="relative">
          <button
            className="flex w-full items-center justify-between rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2.5 text-[13px]"
            data-testid="bulk-edit-project-trigger"
            onClick={() => {
              setSearch("");
              setPicker(picker === "project" ? null : "project");
            }}
            type="button"
          >
            {selectedProject ? (
              <span className="flex items-center gap-2 text-white">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: selectedProject.color }}
                />
                <span className="truncate">{selectedProject.name}</span>
              </span>
            ) : projectTouched ? (
              <span className="text-[var(--track-text-muted)]">No Project</span>
            ) : (
              <span className="text-[var(--track-text-muted)]">Select project</span>
            )}
            <ChevronDownIcon
              className={`size-3 transition-transform ${picker === "project" ? "rotate-180" : ""}`}
            />
          </button>
          {picker === "project" ? (
            <ProjectPickerDropdown
              filteredProjects={filteredProjects}
              onSearch={setSearch}
              onSelect={(id) => {
                setSelectedProjectId(id);
                setProjectTouched(true);
                setPicker(null);
              }}
              search={search}
              workspaceName={workspaceName}
            />
          ) : null}
        </div>

        <div className="relative">
          <button
            className="flex w-full items-center justify-between rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2.5 text-[13px]"
            data-testid="bulk-edit-tag-trigger"
            onClick={() => {
              setSearch("");
              setPicker(picker === "tag" ? null : "tag");
            }}
            type="button"
          >
            {selectedTagIds.size > 0 ? (
              <span className="text-white">
                {selectedTagIds.size} tag{selectedTagIds.size !== 1 ? "s" : ""} selected
              </span>
            ) : (
              <span className="text-[var(--track-text-muted)]">Add tags</span>
            )}
            <ChevronDownIcon
              className={`size-3 transition-transform ${picker === "tag" ? "rotate-180" : ""}`}
            />
          </button>
          {picker === "tag" ? (
            <TagPickerDropdown
              filteredTags={filteredTags}
              onSearch={setSearch}
              onToggle={(id) => {
                setSelectedTagIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) {
                    next.delete(id);
                  } else {
                    next.add(id);
                  }
                  return next;
                });
              }}
              search={search}
              selectedTagIds={selectedTagIds}
            />
          ) : null}
        </div>

        <label className="flex items-center gap-2 px-1 text-[13px] text-[var(--track-text-muted)]">
          <input
            checked={removeExistingTags}
            className="size-3.5 cursor-pointer accent-[var(--track-accent)]"
            data-testid="bulk-edit-remove-tags"
            onChange={() => setRemoveExistingTags((v) => !v)}
            type="checkbox"
          />
          Remove existing tags
        </label>

        <input
          className="w-full rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2.5 text-[13px] text-white focus:border-[var(--track-accent)] focus:outline-none"
          data-testid="bulk-edit-date"
          onChange={(event) => setSelectedDate(event.target.value)}
          type="date"
          value={selectedDate}
        />

        <div className="flex items-center justify-between rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2.5">
          <span className="text-[13px] text-white">Billable</span>
          <button
            aria-label={billable ? "Disable billable" : "Enable billable"}
            className={`relative h-5 w-9 rounded-full transition ${
              billable ? "bg-[var(--track-accent)]" : "bg-[var(--track-control-disabled)]"
            }`}
            data-testid="bulk-edit-billable-toggle"
            onClick={() => {
              setBillable((prev) => !prev);
              setBillableTouched(true);
            }}
            role="switch"
            aria-checked={billable}
            type="button"
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${
                billable ? "translate-x-[18px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-5">
        <button
          className="rounded-lg bg-[var(--track-accent)] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[var(--track-accent-fill-hover)]"
          data-testid="bulk-edit-save"
          onClick={handleSave}
          type="button"
        >
          Save
        </button>
      </div>
    </ModalDialog>
  );
}
