import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { DropdownMenu, IconButton, MenuItem } from "@opentickly/web-ui";

import { MoreIcon } from "../../shared/ui/icons.tsx";
import type { HandlergoalsApiResponse } from "../../shared/api/generated/public-track/types.gen.ts";

type GoalRowActionsMenuProps = {
  goal: HandlergoalsApiResponse;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
};

export function GoalRowActionsMenu({
  goal,
  onArchiveToggle,
  onDelete,
  onEdit,
}: GoalRowActionsMenuProps): ReactElement {
  const { t } = useTranslation("goals");
  return (
    <DropdownMenu
      trigger={
        <IconButton aria-label={t("actionsFor", { name: goal.name })} size="sm">
          <MoreIcon className="size-3.5" />
        </IconButton>
      }
    >
      <MenuItem onClick={onEdit}>{t("editGoal")}</MenuItem>
      <MenuItem onClick={onArchiveToggle}>{goal.active ? t("archive") : t("restore")}</MenuItem>
      <MenuItem destructive onClick={onDelete}>
        {t("delete")}
      </MenuItem>
    </DropdownMenu>
  );
}
