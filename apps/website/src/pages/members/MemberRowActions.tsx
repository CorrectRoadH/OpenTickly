import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AppButton,
  DropdownMenu,
  IconButton,
  MenuItem,
  useDropdownClose,
} from "@opentickly/web-ui";

import { MoreIcon } from "../../shared/ui/icons.tsx";

type MemberRowActionsProps = {
  memberId: number;
  memberName: string;
  canDisable: boolean;
  canRestore: boolean;
  isInvited: boolean;
  canCopyInviteLink: boolean;
  onDisable: (memberId: number) => void;
  onRestore: (memberId: number) => void;
  onRemove: (memberId: number) => void;
  onResendInvite?: (memberId: number) => void;
  onCopyInviteLink?: (memberId: number) => void;
  onCancelInvite?: (memberId: number) => void;
};

export function MemberRowActions({
  memberId,
  memberName,
  canDisable,
  canRestore,
  isInvited,
  canCopyInviteLink,
  onDisable,
  onRestore,
  onRemove,
  onResendInvite,
  onCopyInviteLink,
  onCancelInvite,
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
        canCopyInviteLink={canCopyInviteLink}
        isInvited={isInvited}
        memberId={memberId}
        memberName={memberName}
        onCancelInvite={onCancelInvite}
        onCopyInviteLink={onCopyInviteLink}
        onDisable={onDisable}
        onRemove={onRemove}
        onResendInvite={onResendInvite}
        onRestore={onRestore}
      />
    </DropdownMenu>
  );
}

function MemberMenuContent({
  canDisable,
  canRestore,
  canCopyInviteLink,
  isInvited,
  memberId,
  memberName,
  onCancelInvite,
  onCopyInviteLink,
  onDisable,
  onRemove,
  onResendInvite,
  onRestore,
}: {
  canDisable: boolean;
  canRestore: boolean;
  canCopyInviteLink: boolean;
  isInvited: boolean;
  memberId: number;
  memberName: string;
  onCancelInvite?: (memberId: number) => void;
  onCopyInviteLink?: (memberId: number) => void;
  onDisable: (memberId: number) => void;
  onRemove: (memberId: number) => void;
  onResendInvite?: (memberId: number) => void;
  onRestore: (memberId: number) => void;
}): ReactElement {
  const { t } = useTranslation("members");
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
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

  if (confirmingCancel) {
    return (
      <div className="px-3 py-2">
        <p className="mb-2 text-[12px] text-[var(--track-text-muted)]">
          {t("cancelInviteConfirm", { name: memberName })}
        </p>
        <div className="flex gap-2">
          <AppButton
            danger
            data-testid={`member-cancel-invite-confirm-${memberId}`}
            onClick={() => {
              onCancelInvite?.(memberId);
              close();
            }}
            size="sm"
          >
            {t("cancelInvite")}
          </AppButton>
          <AppButton onClick={() => setConfirmingCancel(false)} size="sm">
            {t("cancel")}
          </AppButton>
        </div>
      </div>
    );
  }

  if (isInvited) {
    return (
      <>
        {onResendInvite ? (
          <MenuItem
            testId={`member-resend-invite-${memberId}`}
            onClick={() => {
              onResendInvite(memberId);
              close();
            }}
          >
            {t("resendInvite")}
          </MenuItem>
        ) : null}
        {onCopyInviteLink && canCopyInviteLink ? (
          <MenuItem
            testId={`member-copy-invite-link-${memberId}`}
            onClick={() => {
              onCopyInviteLink(memberId);
              close();
            }}
          >
            {t("copyInviteLink")}
          </MenuItem>
        ) : null}
        <MenuItem
          destructive
          testId={`member-cancel-invite-${memberId}`}
          onClick={(e) => {
            e.preventDefault();
            setConfirmingCancel(true);
          }}
        >
          {t("cancelInvite")}
        </MenuItem>
      </>
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
