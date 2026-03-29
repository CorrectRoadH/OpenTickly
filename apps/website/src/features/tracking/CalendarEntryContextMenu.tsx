import { type ReactElement, useRef } from "react";
import { createPortal } from "react-dom";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { useDismiss } from "../../shared/ui/useDismiss.ts";

export type ContextMenuPosition = {
  x: number;
  y: number;
};

type CalendarEntryContextMenuProps = {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onClose: () => void;
  onCopyDescription: () => void;
  onCopyStartLink: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFavorite?: () => void;
  onSplit?: () => void;
  position: ContextMenuPosition;
  projectPath?: string;
};

/**
 * Calendar entry right-click context menu.
 * Rendered via portal at the mouse position, matching Toggl's implementation:
 * position:fixed, z-index 201, bg var(--track-surface), border var(--track-border), border-radius 8px.
 */
export function CalendarEntryContextMenu({
  entry,
  onClose,
  onCopyDescription,
  onCopyStartLink,
  onDelete,
  onDuplicate,
  onFavorite,
  onSplit,
  position,
  projectPath,
}: CalendarEntryContextMenuProps): ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(menuRef, true, onClose);

  const hasDescription = Boolean(entry.description?.trim());
  const hasProject = Boolean(entry.project_id ?? entry.pid);

  return createPortal(
    <div
      className="fixed z-[201] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] py-1 shadow-[0_4px_16px_var(--track-shadow-popover)]"
      data-testid="calendar-entry-context-menu"
      ref={menuRef}
      style={{ left: position.x, top: position.y }}
    >
      <ContextMenuItem label="Duplicate" onClick={onDuplicate} />
      <ContextMenuItem disabled={!onSplit} label="Split" onClick={onSplit} />
      <ContextMenuItem disabled={!onFavorite} label="Pin as favorite" onClick={onFavorite} />
      {hasProject && projectPath ? (
        <a
          className="flex h-[30px] cursor-pointer items-center px-2.5 text-[14px] font-medium text-[var(--track-text)] transition hover:bg-white/6"
          href={projectPath}
        >
          Go to project
        </a>
      ) : null}
      <ContextMenuItem
        disabled={!hasDescription}
        label="Copy description"
        onClick={onCopyDescription}
      />
      <ContextMenuItem label="Copy start link" onClick={onCopyStartLink} />
      <ContextMenuItem danger label="Delete" onClick={onDelete} />
    </div>,
    document.body,
  );
}

function ContextMenuItem({
  danger = false,
  disabled = false,
  label,
  onClick,
}: {
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
}): ReactElement {
  return (
    <div
      className={`flex h-[30px] items-center px-2.5 text-[14px] font-medium transition ${
        disabled
          ? "cursor-default text-[var(--track-control-border)]"
          : danger
            ? "cursor-pointer text-[var(--track-danger-text)] hover:bg-white/6"
            : "cursor-pointer text-[var(--track-text)] hover:bg-white/6"
      }`}
      onClick={disabled ? undefined : onClick}
      role="menuitem"
    >
      {label}
    </div>
  );
}
