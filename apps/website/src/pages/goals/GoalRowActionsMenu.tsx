import { type ReactElement } from "react";

import { DropdownMenu, IconButton, MenuItem } from "@opentoggl/web-ui";

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
  return (
    <DropdownMenu
      trigger={
        <IconButton aria-label={`${goal.name} actions`} size="lg">
          <MoreIcon className="size-4" />
        </IconButton>
      }
    >
      <MenuItem onClick={onEdit}>Edit goal</MenuItem>
      <MenuItem onClick={onArchiveToggle}>{goal.active ? "Archive" : "Restore"}</MenuItem>
      <MenuItem destructive onClick={onDelete}>
        Delete
      </MenuItem>
    </DropdownMenu>
  );
}
