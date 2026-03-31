import { type ReactElement, useRef } from "react";
import { createPortal } from "react-dom";
import { MenuItem, MenuLink } from "@opentoggl/web-ui";

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
 * Rendered via portal at the mouse position.
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
      className="fixed z-[201] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-1 shadow-[0_4px_16px_var(--track-shadow-popover)]"
      data-testid="calendar-entry-context-menu"
      ref={menuRef}
      role="menu"
      style={{ left: position.x, top: position.y }}
    >
      <MenuItem onClick={onDuplicate}>Duplicate</MenuItem>
      <MenuItem disabled={!onSplit} onClick={onSplit}>
        Split
      </MenuItem>
      <MenuItem disabled={!onFavorite} onClick={onFavorite}>
        Pin as favorite
      </MenuItem>
      {hasProject && projectPath ? <MenuLink href={projectPath}>Go to project</MenuLink> : null}
      <MenuItem disabled={!hasDescription} onClick={onCopyDescription}>
        Copy description
      </MenuItem>
      <MenuItem onClick={onCopyStartLink}>Copy start link</MenuItem>
      <MenuItem destructive onClick={onDelete}>
        Delete
      </MenuItem>
    </div>,
    document.body,
  );
}
