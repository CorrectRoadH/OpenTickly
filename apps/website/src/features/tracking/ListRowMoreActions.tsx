import { useTranslation } from "react-i18next";

import { DropdownMenu, MenuItem, MenuLink, MenuSeparator } from "@opentoggl/web-ui";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { MoreIcon } from "../../shared/ui/icons.tsx";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";

export function ListRowMoreActions({
  entry,
  onBillableToggle,
  onContinue: _onContinue,
  onDelete,
  onDuplicate,
  onFavorite,
  onSplit,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onBillableToggle?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onContinue?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDelete?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDuplicate?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onFavorite?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onSplit?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
}) {
  const { t } = useTranslation("tracking");
  const label = entry.description?.trim() || "time entry";

  return (
    <DropdownMenu
      minWidth="200px"
      trigger={
        <button
          aria-label={`More actions for ${label}`}
          className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] opacity-0 transition hover:text-white group-hover:opacity-100"
          type="button"
        >
          <MoreIcon className="size-3" />
        </button>
      }
    >
      <MenuItem onClick={() => onBillableToggle?.(entry)}>
        {entry.billable ? t("setAsNonBillable") : t("setAsBillable")}
      </MenuItem>
      <MenuItem onClick={() => onDuplicate?.(entry)}>{t("duplicate")}</MenuItem>
      {entry.start && entry.stop ? (
        <MenuItem onClick={() => onSplit?.(entry)}>{t("split")}</MenuItem>
      ) : null}
      {entry.project_id || entry.pid ? (
        <MenuLink
          href={`/projects/${entry.workspace_id ?? entry.wid}/edit/${resolveTimeEntryProjectId(entry)}`}
        >
          {t("goToProject")}
        </MenuLink>
      ) : null}
      <MenuItem onClick={() => onFavorite?.(entry)}>{t("pinAsFavorite")}</MenuItem>
      <MenuItem onClick={() => void navigator.clipboard.writeText(entry.description?.trim() ?? "")}>
        {t("copyDescription")}
      </MenuItem>
      <MenuItem
        onClick={() => {
          if (typeof entry.id === "number") {
            const startLink = `${window.location.origin}/timer?entry=${entry.id}`;
            void navigator.clipboard.writeText(startLink);
          }
        }}
      >
        {t("copyStartLink")}
      </MenuItem>
      <MenuSeparator />
      <MenuItem destructive onClick={() => onDelete?.(entry)}>
        {t("delete")}
      </MenuItem>
    </DropdownMenu>
  );
}
