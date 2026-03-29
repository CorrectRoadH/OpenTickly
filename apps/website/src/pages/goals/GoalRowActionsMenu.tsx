import { type ReactElement, useCallback, useRef, useState } from "react";

import { MoreIcon } from "../../shared/ui/icons.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";
import type { HandlergoalsApiResponse } from "../../shared/api/generated/public-track/types.gen.ts";

type GoalRowActionsMenuProps = {
  goal: HandlergoalsApiResponse;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
};

export function GoalRowActionsMenu({
  goal,
  onArchiveToggle,
  onDelete,
  onEdit,
}: GoalRowActionsMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, open, close);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label={`${goal.name} actions`}
        className="flex size-8 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreIcon className="size-4" />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-10 z-20 min-w-[180px] rounded-[12px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface-raised)] p-1.5 shadow-[0_16px_32px_var(--track-shadow-overlay)]"
          role="menu"
        >
          <MenuAction label="Edit goal" onSelect={onEdit} />
          <MenuAction label={goal.active ? "Archive" : "Restore"} onSelect={onArchiveToggle} />
          <MenuAction destructive label="Delete" onSelect={onDelete} />
        </div>
      ) : null}
    </div>
  );
}

function MenuAction({
  destructive = false,
  label,
  onSelect,
}: {
  destructive?: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      className={`flex w-full rounded-[10px] px-3 py-2.5 text-left text-[14px] transition hover:bg-white/4 ${
        destructive ? "text-[var(--track-danger-text)]" : "text-[var(--track-overlay-text)]"
      }`}
      onClick={onSelect}
      role="menuitem"
      type="button"
    >
      {label}
    </button>
  );
}
