import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { DropdownMenu, MenuItem, MenuLink } from "@opentickly/web-ui";

import { MoreIcon } from "../../shared/ui/icons.tsx";
import { TimerActionButton } from "../../shared/ui/TimerActionButton.tsx";
import { useEditorContext } from "./TimeEntryEditorContext.tsx";
import { copyToClipboard } from "./time-entry-editor-utils.ts";

export function EditorHeader(): ReactElement {
  const { t } = useTranslation("tracking");
  const ctx = useEditorContext();
  const {
    currentWorkspaceId,
    description,
    entry,
    isDeleting,
    isDirty,
    isPrimaryActionPending,
    onClose,
    onDelete,
    onDuplicate,
    onFavorite,
    onPrimaryAction,
    onSplit,
    primaryActionIcon,
    primaryActionLabel,
    selectedProjectId,
  } = ctx;

  const stop = entry.stop ? new Date(entry.stop) : null;
  const canDuplicate = stop != null && onDuplicate != null;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="relative flex items-center gap-3">
        <TimerActionButton
          ariaLabel={
            primaryActionLabel === "Continue Time Entry" ? t("continueEntry") : primaryActionLabel
          }
          disabled={!onPrimaryAction || isPrimaryActionPending}
          isRunning={primaryActionIcon === "stop"}
          onClick={onPrimaryAction ?? (() => {})}
          size="xs"
        />
        {canDuplicate ? (
          <button
            aria-label={t("duplicateEntry")}
            className="flex size-8 items-center justify-center rounded-full text-[var(--track-overlay-icon)] transition hover:bg-white/6"
            disabled={isDirty}
            onClick={() => {
              void onDuplicate?.();
            }}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="currentColor"
              fillRule="evenodd"
              height="16"
              viewBox="0 0 16 16"
              width="16"
            >
              <path d="M10.998 4C11.55 4 12 4.456 12 5.002v9.996C12 15.55 11.544 16 10.998 16H1.002A1.007 1.007 0 010 14.998V5.002C0 4.45.456 4 1.002 4h9.996zM10 6H2v8h8V6zm5-6l.117.007A.998.998 0 0116 1l-.007-.114.007.116v9.996c0 .546-.448 1.002-1 1.002l-.117-.007a.999.999 0 01-.883-.995V2H5.002c-.507 0-.936-.386-.995-.883L4 1c0-.556.449-1 1.002-1H15z" />
            </svg>
          </button>
        ) : null}
        <DropdownMenu
          placement="bottom-left"
          trigger={
            <button
              aria-label={t("entryActions")}
              className="flex size-8 items-center justify-center rounded-full text-[var(--track-overlay-icon)] transition hover:bg-white/6"
              type="button"
            >
              <MoreIcon className="size-4" />
            </button>
          }
        >
          <MenuItem disabled={!onSplit} onClick={() => void onSplit?.()}>
            {t("split")}
          </MenuItem>
          <MenuItem disabled={!onFavorite} onClick={() => void onFavorite?.()}>
            {t("pinAsFavorite")}
          </MenuItem>
          {selectedProjectId ? (
            <MenuLink href={`/projects/${currentWorkspaceId}/list`}>{t("goToProject")}</MenuLink>
          ) : null}
          <MenuItem
            onClick={() => {
              if (typeof window === "undefined") {
                void copyToClipboard(entry.start ?? "");
                return;
              }
              const params = new URLSearchParams();
              if (description.trim()) params.set("description", description.trim());
              if (selectedProjectId != null) params.set("project_id", String(selectedProjectId));
              if (entry.tag_ids?.length) params.set("tag_ids", entry.tag_ids.join(","));
              if (entry.billable) params.set("billable", "true");
              void copyToClipboard(`${window.location.origin}/timer?${params.toString()}`);
            }}
          >
            {t("copyStartLink")}
          </MenuItem>
          {description.trim() ? (
            <MenuItem onClick={() => void copyToClipboard(description.trim())}>
              {t("copyDescription")}
            </MenuItem>
          ) : null}
          <MenuItem
            destructive
            disabled={!onDelete || isDeleting}
            onClick={() => void onDelete?.()}
          >
            {isDeleting ? t("loading") : t("delete")}
          </MenuItem>
        </DropdownMenu>
      </div>
      <button
        aria-label={t("closeEditor")}
        className="flex size-7 items-center justify-center rounded-full text-[14px] leading-none text-[var(--track-overlay-icon-subtle)] transition hover:bg-white/6 hover:text-white"
        onClick={() => {
          if (isDirty) {
            ctx.dispatch({ type: "SET_DISCARD_CONFIRMATION", show: true });
            return;
          }
          onClose();
        }}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
