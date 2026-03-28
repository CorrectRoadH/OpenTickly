import { type ReactElement, useEffect } from "react";
import { createPortal } from "react-dom";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";

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
 * position:fixed, z-index 201, bg #1b1b1b, border #3a3a3a, border-radius 8px.
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
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-testid="calendar-entry-context-menu"]')) {
        onClose();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const hasDescription = Boolean(entry.description?.trim());
  const hasProject = Boolean(entry.project_id ?? entry.pid);

  return createPortal(
    <div
      className="fixed z-[201] rounded-[8px] border border-[#3a3a3a] bg-[#1b1b1b] py-1 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
      data-testid="calendar-entry-context-menu"
      style={{ left: position.x, top: position.y }}
    >
      <ContextMenuItem label="Duplicate" onClick={onDuplicate} />
      <ContextMenuItem disabled={!onSplit} label="Split" onClick={onSplit} />
      <ContextMenuItem disabled={!onFavorite} label="Pin as favorite" onClick={onFavorite} />
      {hasProject && projectPath ? (
        <a
          className="flex h-[30px] cursor-pointer items-center px-2.5 text-[14px] font-medium text-[#fafafa] transition hover:bg-white/6"
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
          ? "cursor-default text-[#555]"
          : danger
            ? "cursor-pointer text-[#fab8ac] hover:bg-white/6"
            : "cursor-pointer text-[#fafafa] hover:bg-white/6"
      }`}
      onClick={disabled ? undefined : onClick}
      role="menuitem"
    >
      {label}
    </div>
  );
}
