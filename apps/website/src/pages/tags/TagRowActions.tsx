import { type FormEvent, type ReactElement, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AppButton,
  DropdownMenu,
  IconButton,
  MenuItem,
  useDropdownClose,
} from "@opentickly/web-ui";

import { MoreIcon } from "../../shared/ui/icons.tsx";

type TagRowActionsProps = {
  tagId: number;
  tagName: string;
  onDelete: (tagId: number) => void;
  onRename: (tagId: number, name: string) => void;
};

export function TagRowActions({
  tagId,
  tagName,
  onDelete,
  onRename,
}: TagRowActionsProps): ReactElement {
  const { t } = useTranslation("tags");
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(tagName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(tagName);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, tagName]);

  function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== tagName) {
      onRename(tagId, trimmed);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <form className="flex items-center gap-1.5" onSubmit={handleRenameSubmit}>
        <input
          className="h-6 w-[160px] rounded-[4px] border border-[var(--track-accent-soft)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white outline-none"
          data-testid={`tag-rename-input-${tagId}`}
          onBlur={() => {
            const trimmed = editValue.trim();
            if (trimmed && trimmed !== tagName) {
              onRename(tagId, trimmed);
            }
            setEditing(false);
          }}
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
        <IconButton aria-label={t("actionsFor", { name: tagName })} size="sm">
          <MoreIcon className="size-3.5" />
        </IconButton>
      }
      testId={`tag-actions-menu-${tagId}`}
      minWidth="180px"
    >
      <TagMenuContent
        onDelete={onDelete}
        onStartEditing={() => setEditing(true)}
        tagId={tagId}
        tagName={tagName}
      />
    </DropdownMenu>
  );
}

function TagMenuContent({
  onDelete,
  onStartEditing,
  tagId,
  tagName,
}: {
  onDelete: (tagId: number) => void;
  onStartEditing: () => void;
  tagId: number;
  tagName: string;
}): ReactElement {
  const { t } = useTranslation("tags");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const close = useDropdownClose();

  if (confirmingDelete) {
    return (
      <div className="px-3 py-2">
        <p className="mb-2 text-[12px] text-[var(--track-text-muted)]">
          {t("deleteTagConfirm", { name: tagName })}
        </p>
        <div className="flex gap-2">
          <AppButton
            onClick={() => {
              onDelete(tagId);
              close();
            }}
            data-testid={`tag-delete-confirm-${tagId}`}
            size="sm"
            danger
          >
            {t("delete")}
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
      <MenuItem
        testId={`tag-rename-${tagId}`}
        onClick={(e) => {
          e.preventDefault();
          close();
          onStartEditing();
        }}
      >
        {t("rename")}
      </MenuItem>
      <MenuItem
        destructive
        testId={`tag-delete-${tagId}`}
        onClick={(e) => {
          e.preventDefault();
          setConfirmingDelete(true);
        }}
      >
        {t("delete")}
      </MenuItem>
    </>
  );
}
