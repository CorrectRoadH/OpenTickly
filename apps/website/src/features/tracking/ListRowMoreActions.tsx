import { useTranslation } from "react-i18next";

import { DropdownMenu, MenuItem, MenuLink, MenuSeparator } from "@opentickly/web-ui";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { copyToClipboard } from "../../shared/lib/clipboard.ts";
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
      <MenuItem onClick={() => void copyToClipboard(entry.description?.trim() ?? "")}>
        {t("copyDescription")}
      </MenuItem>
      <MenuItem
        onClick={() => {
          const params = new URLSearchParams();
          const desc = (entry.description ?? "").trim();
          if (desc) params.set("description", desc);
          const projectId = resolveTimeEntryProjectId(entry);
          if (projectId != null) params.set("project_id", String(projectId));
          if (entry.tag_ids?.length) params.set("tag_ids", entry.tag_ids.join(","));
          if (entry.billable) params.set("billable", "true");
          void copyToClipboard(`${window.location.origin}/timer?${params.toString()}`);
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
