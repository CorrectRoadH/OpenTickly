import { AppButton, DropdownMenu, IconButton, useDropdownClose } from "@opentickly/web-ui";
import { type ReactElement, type ReactNode, useState } from "react";
import type { GroupOrganizationGroupResponse } from "../../shared/api/generated/public-track/types.gen.ts";
import { MoreIcon } from "../../shared/ui/icons.tsx";

export function GroupRowActions({
  group,
  onDelete,
  onManageMembers,
  onRename,
  t,
}: {
  group: GroupOrganizationGroupResponse;
  onDelete: () => void;
  onManageMembers: () => void;
  onRename: (name: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}): ReactElement {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(group.name ?? "");

  if (editing) {
    return (
      <form
        className="flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = editValue.trim();
          if (trimmed && trimmed !== group.name) {
            onRename(trimmed);
          }
          setEditing(false);
        }}
      >
        <input
          autoFocus
          className="h-6 w-[160px] rounded-[4px] border border-[var(--track-accent-soft)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white outline-none"
          onBlur={() => setEditing(false)}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          value={editValue}
        />
      </form>
    );
  }

  return (
    <DropdownMenu
      trigger={
        <IconButton aria-label={`Actions for ${group.name}`} size="sm">
          <MoreIcon className="size-3.5" />
        </IconButton>
      }
      minWidth="160px"
    >
      <GroupMenuContent
        groupName={group.name ?? ""}
        onDelete={onDelete}
        onManageMembers={onManageMembers}
        onStartEditing={() => {
          setEditValue(group.name ?? "");
          setEditing(true);
        }}
        t={t}
      />
    </DropdownMenu>
  );
}

function GroupMenuContent({
  groupName,
  onDelete,
  onManageMembers,
  onStartEditing,
  t,
}: {
  groupName: string;
  onDelete: () => void;
  onManageMembers: () => void;
  onStartEditing: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}): ReactNode {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const close = useDropdownClose();

  if (confirmingDelete) {
    return (
      <div className="px-3 py-2">
        <p className="mb-2 text-[12px] text-[var(--track-text-muted)]">
          {t("confirmDeleteTeam", { name: groupName })}
        </p>
        <div className="flex gap-2">
          <AppButton
            onClick={() => {
              onDelete();
              close();
            }}
            size="sm"
            danger
          >
            {t("deleteTeam")}
          </AppButton>
          <AppButton onClick={() => setConfirmingDelete(false)} size="sm">
            {t("cancel")}
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-white hover:bg-[var(--track-surface-muted)]"
        onClick={() => {
          onManageMembers();
          close();
        }}
        type="button"
      >
        {t("manageMembers")}
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-white hover:bg-[var(--track-surface-muted)]"
        onClick={() => {
          close();
          onStartEditing();
        }}
        type="button"
      >
        {t("renameTeam")}
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-rose-400 hover:bg-[var(--track-surface-muted)]"
        onClick={() => setConfirmingDelete(true)}
        type="button"
      >
        {t("deleteTeam")}
      </button>
    </>
  );
}
