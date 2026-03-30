import { type FormEvent, type ReactElement, useEffect, useRef, useState } from "react";

import { AppButton, DropdownMenu, IconButton, useDropdownClose } from "@opentoggl/web-ui";

import { MoreIcon } from "../../shared/ui/icons.tsx";

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
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(clientName);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <DropdownMenu
      trigger={
        <IconButton aria-label={`Actions for ${clientName}`} size="sm">
          <MoreIcon className="size-3.5" />
        </IconButton>
      }
      testId={`client-actions-menu-${clientId}`}
      minWidth="140px"
    >
      <ClientMenuContent
        clientId={clientId}
        clientName={clientName}
        onArchive={onArchive}
        onDelete={onDelete}
        onStartEditing={() => setEditing(true)}
      />
    </DropdownMenu>
  );
}

function ClientMenuContent({
  clientId,
  clientName,
  onArchive,
  onDelete,
  onStartEditing,
}: {
  clientId: number;
  clientName: string;
  onArchive: (clientId: number) => void;
  onDelete: (clientId: number) => void;
  onStartEditing: () => void;
}): ReactElement {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const close = useDropdownClose();

  if (confirmingDelete) {
    return (
      <div className="px-3 py-2">
        <p className="mb-2 text-[12px] text-[var(--track-text-muted)]">
          Delete &ldquo;{clientName}&rdquo;?
        </p>
        <div className="flex gap-2">
          <AppButton
            onClick={() => {
              onDelete(clientId);
              close();
            }}
            data-testid={`client-delete-confirm-${clientId}`}
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
    );
  }

  return (
    <>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-white hover:bg-[var(--track-surface-muted)]"
        data-testid={`client-rename-${clientId}`}
        onClick={() => {
          close();
          onStartEditing();
        }}
        type="button"
      >
        Edit
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-white hover:bg-[var(--track-surface-muted)]"
        onClick={() => {
          onArchive(clientId);
          close();
        }}
        type="button"
      >
        Archive
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-rose-400 hover:bg-[var(--track-surface-muted)]"
        data-testid={`client-delete-${clientId}`}
        onClick={() => setConfirmingDelete(true)}
        type="button"
      >
        Delete
      </button>
    </>
  );
}
