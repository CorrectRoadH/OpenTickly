import { AppButton, IconButton } from "@opentickly/web-ui";
import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { ArchiveIcon, CloseIcon, EditIcon, TrashIcon } from "../../shared/ui/icons.tsx";
import { useBulkAction } from "../../shared/query/useBulkAction.ts";

type ProjectsBulkBarProps = {
  onArchive: (projectId: number) => Promise<unknown>;
  onDelete: (projectId: number) => Promise<unknown>;
  onEditSingle: (projectId: number) => void;
  onSelectionChange: (selectedIds: Set<number>) => void;
  onStatus: (message: string) => void;
  selectedIds: ReadonlySet<number>;
};

export function ProjectsBulkBar({
  onArchive,
  onDelete,
  onEditSingle,
  onSelectionChange,
  onStatus,
  selectedIds,
}: ProjectsBulkBarProps): ReactElement {
  const { t } = useTranslation("projects");
  const { isPending, run } = useBulkAction(onSelectionChange, onStatus);
  const ids = [...selectedIds];
  const runBulkAction = (
    action: (id: number) => Promise<unknown>,
    success: string,
    failure: string,
  ) => run(ids, action, t(success, { count: ids.length }), t(failure));

  return (
    <div
      className="flex items-center gap-4 border-b border-[var(--track-border)] px-6 py-2.5"
      data-testid="projects-bulk-bar"
    >
      <span className="text-[14px] font-medium text-white">
        {t("itemsSelected", { count: selectedIds.size })}
      </span>
      <span className="h-4 w-px bg-[var(--track-border)]" />
      <AppButton
        disabled={isPending || ids.length !== 1}
        onClick={() => onEditSingle(ids[0]!)}
        size="sm"
      >
        <EditIcon className="size-3.5" />
        <span>{t("edit")}</span>
      </AppButton>
      <AppButton
        disabled={isPending}
        onClick={() => void runBulkAction(onArchive, "projectsArchived", "bulkArchiveFailed")}
        size="sm"
      >
        <ArchiveIcon className="size-3.5" />
        <span>{t("archive")}</span>
      </AppButton>
      <AppButton
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(t("deleteProjectsConfirm", { count: ids.length }))) return;
          void runBulkAction(onDelete, "projectsDeleted", "bulkDeleteFailed");
        }}
        size="sm"
      >
        <TrashIcon className="size-3.5" />
        <span>{t("delete")}</span>
      </AppButton>
      <IconButton
        aria-label={t("clearSelection")}
        disabled={isPending}
        onClick={() => onSelectionChange(new Set())}
        size="sm"
      >
        <CloseIcon className="size-3.5" />
      </IconButton>
    </div>
  );
}
