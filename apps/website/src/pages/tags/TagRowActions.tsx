import { type FormEvent, type ReactElement, useEffect, useRef, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";

type TagRowActionsProps = {
  tagId: number;
  tagName: string;
  onDelete: (tagId: number) => void;
  onRename: (tagId: number, name: string) => void;
};

/**
 * Context menu and inline-edit actions for a single tag row.
 * Shows a "..." button that opens a dropdown with Rename and Delete options.
 * Follows the same pattern as ClientRowActions.
 */
export function TagRowActions({
  tagId,
  tagName,
  onDelete,
  onRename,
}: TagRowActionsProps): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editValue, setEditValue] = useState(tagName);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (editing) {
      setEditValue(tagName);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, tagName]);

  function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== tagName) {
      onRename(tagId, trimmed);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <form className="flex items-center gap-1.5" onSubmit={handleRenameSubmit}>
        <input
          className="h-6 w-[160px] rounded-[4px] border border-[var(--track-accent-soft)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white outline-none"
          data-testid={`tag-rename-input-${tagId}`}
          onBlur={() => {
            const trimmed = editValue.trim();
            if (trimmed && trimmed !== tagName) {
              onRename(tagId, trimmed);
            }
            setEditing(false);
          }}
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
        aria-label={`Actions for ${tagName}`}
        className="flex size-6 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
        data-testid={`tag-actions-${tagId}`}
        onClick={() => {
          setMenuOpen(!menuOpen);
          setConfirmingDelete(false);
        }}
        type="button"
      >
        <TrackingIcon className="size-3.5" name="more" />
      </button>
      {menuOpen ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] py-1 shadow-lg"
          data-testid={`tag-actions-menu-${tagId}`}
        >
          {confirmingDelete ? (
            <div className="px-3 py-2">
              <p className="mb-2 text-[12px] text-[var(--track-text-muted)]">
                Delete &ldquo;{tagName}&rdquo;?
              </p>
              <div className="flex gap-2">
                <button
                  className="h-6 rounded-[4px] bg-rose-600 px-2.5 text-[11px] font-semibold text-white"
                  data-testid={`tag-delete-confirm-${tagId}`}
                  onClick={() => {
                    onDelete(tagId);
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
                data-testid={`tag-rename-${tagId}`}
                onClick={() => {
                  setMenuOpen(false);
                  setEditing(true);
                }}
                type="button"
              >
                Rename
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-rose-400 hover:bg-[var(--track-surface-muted)]"
                data-testid={`tag-delete-${tagId}`}
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
