import { AppButton, IconButton } from "@opentickly/web-ui";
import { useTranslation } from "react-i18next";
import { ArchiveIcon, CloseIcon, EditIcon, TrashIcon } from "../../shared/ui/icons.tsx";

type Props = {
  selectedIds: ReadonlySet<number>;
  isPending: boolean;
  onRename: (id: number) => void;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
};
export function ClientsBulkBar({
  selectedIds,
  isPending,
  onRename,
  onArchive,
  onDelete,
  onClear,
}: Props) {
  const { t } = useTranslation("clients");
  return (
    <div className="flex items-center gap-4 border-b border-[var(--track-border)] px-6 py-2.5">
      <span className="text-[14px] font-medium text-white">
        {t("itemsSelected", { count: selectedIds.size })}
      </span>
      <span className="h-4 w-px bg-[var(--track-border)]" />
      <AppButton
        disabled={isPending || selectedIds.size !== 1}
        onClick={() => onRename([...selectedIds][0]!)}
        size="sm"
      >
        <EditIcon className="size-3.5" />
        {t("edit")}
      </AppButton>
      <AppButton disabled={isPending} onClick={onArchive} size="sm">
        <ArchiveIcon className="size-3.5" />
        {t("archive")}
      </AppButton>
      <AppButton
        disabled={isPending}
        onClick={() => {
          if (window.confirm(t("deleteClientsConfirm", { count: selectedIds.size }))) onDelete();
        }}
        size="sm"
      >
        <TrashIcon className="size-3.5" />
        {t("delete")}
      </AppButton>
      <IconButton aria-label={t("clearSelection")} disabled={isPending} onClick={onClear} size="sm">
        <CloseIcon className="size-3.5" />
      </IconButton>
    </div>
  );
}
