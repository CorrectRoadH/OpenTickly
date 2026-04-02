import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { EntryGroup } from "./overview-data.ts";
import { CloseIcon, EditIcon, TrashIcon } from "../../shared/ui/icons.tsx";

export { BulkEditDialog } from "./BulkEditDialog.tsx";
export type { BulkEditUpdates } from "./BulkEditDialog.tsx";

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
  const { t } = useTranslation("tracking");
  return (
    <div
      className="flex items-center gap-4 border-b border-[var(--track-border)] px-6 py-2.5"
      data-testid="bulk-action-toolbar"
    >
      <span className="text-[12px] font-medium text-white">
        {count} {count !== 1 ? t("itemsSelected") : t("itemSelected")}
      </span>
      <button
        aria-label={t("bulkEditSelectedEntries")}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] text-white transition hover:bg-[var(--track-row-hover)]"
        onClick={onEdit}
        type="button"
      >
        <EditIcon className="size-3.5" />
        <span>{t("edit")}</span>
      </button>
      <button
        aria-label={t("deleteSelectedEntries")}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] text-white transition hover:bg-[var(--track-row-hover)]"
        onClick={onDelete}
        type="button"
      >
        <TrashIcon className="size-3.5" />
        <span>{t("delete")}</span>
      </button>
      <button
        aria-label={t("clearSelection")}
        className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
        onClick={onClear}
        type="button"
      >
        <CloseIcon className="size-3.5" />
      </button>
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
  const { t } = useTranslation("tracking");
  const entryWord = count === 1 ? t("timeEntry") : t("timeEntries");
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
        aria-label={`${t("delete")} ${count} ${entryWord}`}
        className="w-[360px] rounded-xl bg-[var(--track-grid)] p-6 shadow-xl"
        data-testid="delete-confirm-dialog"
        role="dialog"
      >
        <h2 className="mb-3 text-[14px] font-semibold text-white">
          {t("deleteConfirmationTitle", { count, entryWord })}
        </h2>
        <p className="mb-5 text-[12px] text-[var(--track-text-muted)]">
          {t("actionCannotBeUndone")}
        </p>
        <div className="flex gap-3">
          <button
            className="rounded-lg bg-rose-600 px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-rose-500"
            data-testid="delete-confirm-button"
            onClick={onConfirm}
            type="button"
          >
            {t("delete")}
          </button>
          <button
            className="rounded-lg border border-[var(--track-border)] px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-[var(--track-row-hover)]"
            onClick={onCancel}
            type="button"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
