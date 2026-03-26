import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";

import type { EntryGroup } from "./overview-data.ts";
import { TrackingIcon } from "./tracking-icons.tsx";

/**
 * Selection state and helpers for list view bulk operations.
 */
export function useListSelection(groups: EntryGroup[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const allEntryIds = useMemo(() => {
    const ids = new Set<number>();
    for (const group of groups) {
      for (const entry of group.entries) {
        if (typeof entry.id === "number") ids.add(entry.id);
      }
    }
    return ids;
  }, [groups]);

  const toggleEntry = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleGroup = useCallback((group: EntryGroup) => {
    setSelectedIds((prev) => {
      const groupIds = group.entries
        .map((e) => e.id)
        .filter((id): id is number => typeof id === "number");
      const allSelected = groupIds.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of groupIds) {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isGroupFullySelected = useCallback(
    (group: EntryGroup) => {
      const groupIds = group.entries
        .map((e) => e.id)
        .filter((id): id is number => typeof id === "number");
      return groupIds.length > 0 && groupIds.every((id) => selectedIds.has(id));
    },
    [selectedIds],
  );

  const isGroupPartiallySelected = useCallback(
    (group: EntryGroup) => {
      const groupIds = group.entries
        .map((e) => e.id)
        .filter((id): id is number => typeof id === "number");
      const someSelected = groupIds.some((id) => selectedIds.has(id));
      const allSelected = groupIds.every((id) => selectedIds.has(id));
      return someSelected && !allSelected;
    },
    [selectedIds],
  );

  return {
    allEntryIds,
    clearSelection,
    isGroupFullySelected,
    isGroupPartiallySelected,
    selectedIds,
    toggleEntry,
    toggleGroup,
  };
}

/**
 * Toolbar shown at the top of the list view when entries are selected.
 * Matches the Toggl bulk-action bar: "{N} item(s) selected  [Edit] [Delete] [X]"
 */
export function BulkActionToolbar({
  count,
  onClear,
  onDelete,
  onEdit,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onEdit: () => void;
}): ReactElement {
  return (
    <div
      className="flex items-center gap-4 border-b border-[var(--track-border)] px-6 py-2.5"
      data-testid="bulk-action-toolbar"
    >
      <span className="text-[13px] font-medium text-white">
        {count} item{count !== 1 ? "s" : ""} selected
      </span>
      <button
        aria-label="Bulk edit selected entries"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-white transition hover:bg-[var(--track-row-hover)]"
        onClick={onEdit}
        type="button"
      >
        <TrackingIcon className="size-3.5" name="edit" />
        <span>Edit</span>
      </button>
      <button
        aria-label="Delete selected entries"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-white transition hover:bg-[var(--track-row-hover)]"
        onClick={onDelete}
        type="button"
      >
        <TrackingIcon className="size-3.5" name="trash" />
        <span>Delete</span>
      </button>
      <button
        aria-label="Clear selection"
        className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
        onClick={onClear}
        type="button"
      >
        <TrackingIcon className="size-3.5" name="close" />
      </button>
    </div>
  );
}

/**
 * Modal dialog for bulk editing selected time entries.
 * Fields are optional -- only filled values would be applied (API integration later).
 */
export function BulkEditDialog({
  count,
  onClose,
}: {
  count: number;
  onClose: () => void;
}): ReactElement {
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(false);

  const entryWord = count === 1 ? "time entry" : "time entries";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="bulk-edit-dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div
        aria-label={`Bulk edit ${count} ${entryWord}`}
        className="w-[420px] rounded-xl bg-[#2c2c2c] p-6 shadow-xl"
        data-testid="bulk-edit-dialog"
        role="dialog"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">
            Bulk edit {count} {entryWord}
          </h2>
          <button
            aria-label="Close bulk edit dialog"
            className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <TrackingIcon className="size-4" name="close" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            className="w-full rounded-lg border border-[var(--track-border)] bg-[#1b1b1b] px-3 py-2.5 text-[13px] text-white placeholder:text-[var(--track-text-muted)] focus:border-[#e57bd9] focus:outline-none"
            data-testid="bulk-edit-description"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="New description..."
            type="text"
            value={description}
          />

          <button
            className="flex w-full items-center justify-between rounded-lg border border-[var(--track-border)] bg-[#1b1b1b] px-3 py-2.5 text-[13px] text-[var(--track-text-muted)]"
            type="button"
          >
            <span>Select project</span>
            <TrackingIcon className="size-3" name="chevron-down" />
          </button>

          <button
            className="flex w-full items-center justify-between rounded-lg border border-[var(--track-border)] bg-[#1b1b1b] px-3 py-2.5 text-[13px] text-[var(--track-text-muted)]"
            type="button"
          >
            <span>Add tags</span>
            <TrackingIcon className="size-3" name="chevron-down" />
          </button>

          <div className="flex items-center justify-between rounded-lg border border-[var(--track-border)] bg-[#1b1b1b] px-3 py-2.5">
            <span className="text-[13px] text-white">Billable</span>
            <button
              aria-label={billable ? "Disable billable" : "Enable billable"}
              className={`relative h-5 w-9 rounded-full transition ${
                billable ? "bg-[#e57bd9]" : "bg-[#4a4a4a]"
              }`}
              data-testid="bulk-edit-billable-toggle"
              onClick={() => setBillable((prev) => !prev)}
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
            className="rounded-lg bg-[#e57bd9] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#d06bc4]"
            data-testid="bulk-edit-save"
            onClick={onClose}
            type="button"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Confirmation dialog shown before deleting selected time entries.
 */
export function DeleteConfirmDialog({
  count,
  onCancel,
  onConfirm,
}: {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}): ReactElement {
  const entryWord = count === 1 ? "time entry" : "time entries";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="delete-confirm-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      role="presentation"
    >
      <div
        aria-label={`Delete ${count} ${entryWord}`}
        className="w-[360px] rounded-xl bg-[#2c2c2c] p-6 shadow-xl"
        data-testid="delete-confirm-dialog"
        role="dialog"
      >
        <h2 className="mb-3 text-[15px] font-semibold text-white">
          Delete {count} {entryWord}?
        </h2>
        <p className="mb-5 text-[13px] text-[var(--track-text-muted)]">
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            className="rounded-lg bg-rose-600 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-rose-500"
            data-testid="delete-confirm-button"
            onClick={onConfirm}
            type="button"
          >
            Delete
          </button>
          <button
            className="rounded-lg border border-[var(--track-border)] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[var(--track-row-hover)]"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
