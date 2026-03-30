import { type ReactElement, useState } from "react";

import { DropdownMenu, useDropdownClose } from "@opentoggl/web-ui";

import { MoreIcon } from "../../shared/ui/icons.tsx";

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
  return (
    <DropdownMenu
      trigger={
        <button
          aria-label={`Actions for ${memberName}`}
          className="flex size-6 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
          data-testid={`member-actions-${memberId}`}
          type="button"
        >
          <MoreIcon className="size-3.5" />
        </button>
      }
      testId={`member-actions-menu-${memberId}`}
      minWidth="160px"
    >
      <MemberMenuContent
        canDisable={canDisable}
        canRestore={canRestore}
        memberId={memberId}
        memberName={memberName}
        onDisable={onDisable}
        onRemove={onRemove}
        onRestore={onRestore}
      />
    </DropdownMenu>
  );
}

function MemberMenuContent({
  canDisable,
  canRestore,
  memberId,
  memberName,
  onDisable,
  onRemove,
  onRestore,
}: {
  canDisable: boolean;
  canRestore: boolean;
  memberId: number;
  memberName: string;
  onDisable: (memberId: number) => void;
  onRemove: (memberId: number) => void;
  onRestore: (memberId: number) => void;
}): ReactElement {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const close = useDropdownClose();

  if (confirmingRemove) {
    return (
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
              close();
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
    );
  }

  return (
    <>
      {canDisable ? (
        <button
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-white hover:bg-[var(--track-surface-muted)]"
          data-testid={`member-disable-${memberId}`}
          onClick={() => {
            onDisable(memberId);
            close();
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
            close();
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
  );
}
