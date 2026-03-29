import { type ReactElement, useCallback, useRef, useState } from "react";

import { MoreIcon } from "../../shared/ui/icons.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";

type MemberRowActionsProps = {
  memberId: number;
  memberName: string;
  canDisable: boolean;
  canRestore: boolean;
  onDisable: (memberId: number) => void;
  onRestore: (memberId: number) => void;
  onRemove: (memberId: number) => void;
};

export function MemberRowActions({
  memberId,
  memberName,
  canDisable,
  canRestore,
  onDisable,
  onRestore,
  onRemove,
}: MemberRowActionsProps): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setConfirmingRemove(false);
  }, []);
  useDismiss(menuRef, menuOpen, closeMenu);

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-label={`Actions for ${memberName}`}
        className="flex size-6 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
        data-testid={`member-actions-${memberId}`}
        onClick={() => {
          setMenuOpen(!menuOpen);
          setConfirmingRemove(false);
        }}
        type="button"
      >
        <MoreIcon className="size-3.5" />
      </button>
      {menuOpen ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] py-1 shadow-lg"
          data-testid={`member-actions-menu-${memberId}`}
        >
          {confirmingRemove ? (
            <div className="px-3 py-2">
              <p className="mb-2 text-[12px] text-[var(--track-text-muted)]">
                Remove &ldquo;{memberName}&rdquo;?
              </p>
              <div className="flex gap-2">
                <button
                  className="h-6 rounded-[4px] bg-rose-600 px-2.5 text-[11px] font-semibold text-white"
                  data-testid={`member-remove-confirm-${memberId}`}
                  onClick={() => {
                    onRemove(memberId);
                    setMenuOpen(false);
                    setConfirmingRemove(false);
                  }}
                  type="button"
                >
                  Remove
                </button>
                <button
                  className="h-6 rounded-[4px] border border-[var(--track-border)] px-2.5 text-[11px] text-[var(--track-text-muted)]"
                  onClick={() => setConfirmingRemove(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {canDisable ? (
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-white hover:bg-[var(--track-surface-muted)]"
                  data-testid={`member-disable-${memberId}`}
                  onClick={() => {
                    onDisable(memberId);
                    setMenuOpen(false);
                  }}
                  type="button"
                >
                  Disable
                </button>
              ) : null}
              {canRestore ? (
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-white hover:bg-[var(--track-surface-muted)]"
                  data-testid={`member-restore-${memberId}`}
                  onClick={() => {
                    onRestore(memberId);
                    setMenuOpen(false);
                  }}
                  type="button"
                >
                  Restore
                </button>
              ) : null}
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-rose-400 hover:bg-[var(--track-surface-muted)]"
                data-testid={`member-remove-${memberId}`}
                onClick={() => setConfirmingRemove(true)}
                type="button"
              >
                Remove
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
