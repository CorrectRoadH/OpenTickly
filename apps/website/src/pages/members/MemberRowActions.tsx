import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppButton, DropdownMenu, IconButton, MenuItem, useDropdownClose } from "@opentoggl/web-ui";

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
  const { t } = useTranslation("members");
  return (
    <DropdownMenu
      trigger={
        <IconButton
          aria-label={t("actionsFor", { name: memberName })}
          data-testid={`member-actions-${memberId}`}
          size="sm"
        >
          <MoreIcon className="size-3.5" />
        </IconButton>
      }
      testId={`member-actions-menu-${memberId}`}
      minWidth="180px"
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
  const { t } = useTranslation("members");
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const close = useDropdownClose();

  if (confirmingRemove) {
    return (
      <div className="px-3 py-2">
        <p className="mb-2 text-[12px] text-[var(--track-text-muted)]">
          {t("removeMemberConfirm", { name: memberName })}
        </p>
        <div className="flex gap-2">
          <AppButton
            danger
            data-testid={`member-remove-confirm-${memberId}`}
            onClick={() => {
              onRemove(memberId);
              close();
            }}
            size="sm"
          >
            {t("remove")}
          </AppButton>
          <AppButton onClick={() => setConfirmingRemove(false)} size="sm">
            {t("cancel")}
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <>
      {canDisable ? (
        <MenuItem
          testId={`member-disable-${memberId}`}
          onClick={() => {
            onDisable(memberId);
            close();
          }}
        >
          {t("disable")}
        </MenuItem>
      ) : null}
      {canRestore ? (
        <MenuItem
          testId={`member-restore-${memberId}`}
          onClick={() => {
            onRestore(memberId);
            close();
          }}
        >
          {t("restore")}
        </MenuItem>
      ) : null}
      <MenuItem
        destructive
        testId={`member-remove-${memberId}`}
        onClick={(e) => {
          e.preventDefault();
          setConfirmingRemove(true);
        }}
      >
        {t("remove")}
      </MenuItem>
    </>
  );
}
