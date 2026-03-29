import { type FormEvent, type ReactElement, useCallback, useEffect, useRef, useState } from "react";

import { AppButton, IconButton } from "@opentoggl/web-ui";

import { MoreIcon } from "../../shared/ui/icons.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";

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

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setConfirmingDelete(false);
  }, []);
  useDismiss(menuRef, menuOpen, closeMenu);

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
      <IconButton
        aria-label={`Actions for ${tagName}`}
        onClick={() => {
          setMenuOpen(!menuOpen);
          setConfirmingDelete(false);
        }}
        size="sm"
      >
        <MoreIcon className="size-3.5" />
      </IconButton>
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
                <AppButton
                  onClick={() => {
                    onDelete(tagId);
                    setMenuOpen(false);
                    setConfirmingDelete(false);
                  }}
                  data-testid={`tag-delete-confirm-${tagId}`}
                  size="sm"
                  danger
                >
                  Delete
                </AppButton>
                <AppButton onClick={() => setConfirmingDelete(false)} size="sm">
                  Cancel
                </AppButton>
              </div>
            </div>
          ) : (
            <>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-white hover:bg-[var(--track-surface-muted)]"
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
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-rose-400 hover:bg-[var(--track-surface-muted)]"
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
