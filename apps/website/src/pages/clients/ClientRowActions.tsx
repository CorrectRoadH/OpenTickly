import { type FormEvent, type ReactElement, useCallback, useEffect, useRef, useState } from "react";

import { MoreIcon } from "../../shared/ui/icons.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";

type ClientRowActionsProps = {
  clientId: number;
  clientName: string;
  onArchive: (clientId: number) => void;
  onDelete: (clientId: number) => void;
  onRename: (clientId: number, name: string) => void;
};

/**
 * Context menu and inline-edit actions for a single client row.
 * Shows a "..." button that opens a dropdown with Rename and Delete options.
 */
export function ClientRowActions({
  clientId,
  clientName,
  onArchive,
  onDelete,
  onRename,
}: ClientRowActionsProps): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editValue, setEditValue] = useState(clientName);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setConfirmingDelete(false);
  }, []);
  useDismiss(menuRef, menuOpen, closeMenu);

  useEffect(() => {
    if (editing) {
      setEditValue(clientName);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, clientName]);

  function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== clientName) {
      onRename(clientId, trimmed);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <form className="flex items-center gap-1.5" onSubmit={handleRenameSubmit}>
        <input
          className="h-6 w-[160px] rounded-[4px] border border-[var(--track-accent-soft)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white outline-none"
          data-testid={`client-rename-input-${clientId}`}
          onBlur={() => setEditing(false)}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          ref={inputRef}
          value={editValue}
        />
      </form>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-label={`Actions for ${clientName}`}
        className="flex size-6 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
        data-testid={`client-actions-${clientId}`}
        onClick={() => {
          setMenuOpen(!menuOpen);
          setConfirmingDelete(false);
        }}
        type="button"
      >
        <MoreIcon className="size-3.5" />
      </button>
      {menuOpen ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] py-1 shadow-lg"
          data-testid={`client-actions-menu-${clientId}`}
        >
          {confirmingDelete ? (
            <div className="px-3 py-2">
              <p className="mb-2 text-[12px] text-[var(--track-text-muted)]">
                Delete &ldquo;{clientName}&rdquo;?
              </p>
              <div className="flex gap-2">
                <button
                  className="h-6 rounded-[4px] bg-rose-600 px-2.5 text-[11px] font-semibold text-white"
                  data-testid={`client-delete-confirm-${clientId}`}
                  onClick={() => {
                    onDelete(clientId);
                    setMenuOpen(false);
                    setConfirmingDelete(false);
                  }}
                  type="button"
                >
                  Delete
                </button>
                <button
                  className="h-6 rounded-[4px] border border-[var(--track-border)] px-2.5 text-[11px] text-[var(--track-text-muted)]"
                  onClick={() => setConfirmingDelete(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-white hover:bg-[var(--track-surface-muted)]"
                data-testid={`client-rename-${clientId}`}
                onClick={() => {
                  setMenuOpen(false);
                  setEditing(true);
                }}
                type="button"
              >
                Edit
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-white hover:bg-[var(--track-surface-muted)]"
                onClick={() => {
                  onArchive(clientId);
                  setMenuOpen(false);
                }}
                type="button"
              >
                Archive
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-rose-400 hover:bg-[var(--track-surface-muted)]"
                data-testid={`client-delete-${clientId}`}
                onClick={() => setConfirmingDelete(true)}
                type="button"
              >
                Delete
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
