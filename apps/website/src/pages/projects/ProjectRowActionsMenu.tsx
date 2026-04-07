import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { DropdownMenu, IconButton, MenuItem, MenuLink } from "@opentoggl/web-ui";

import { MoreIcon } from "../../shared/ui/icons.tsx";
import { buildWorkspaceReportsPath } from "../../shared/lib/workspace-routing.ts";
import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";

type ProjectRowActionsMenuProps = {
  onAddMember: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onTemplateToggle: () => void;
  project: GithubComTogglTogglApiInternalModelsProject;
  workspaceId: number;
};

export function ProjectRowActionsMenu({
  onAddMember,
  onArchiveToggle,
  onDelete,
  onEdit,
  onTemplateToggle,
  project,
  workspaceId,
}: ProjectRowActionsMenuProps): ReactElement {
  const { t } = useTranslation("projects");
  return (
    <DropdownMenu
      trigger={
        <IconButton aria-label={`${project.name} actions`} size="lg">
          <MoreIcon className="size-4" />
        </IconButton>
      }
      minWidth="220px"
    >
      <MenuItem onClick={onEdit}>{t("editProject")}</MenuItem>
      <MenuItem onClick={onAddMember}>{t("addMember")}</MenuItem>
      <MenuLink href={buildWorkspaceReportsPath(workspaceId)}>{t("viewInReports")}</MenuLink>
      <MenuItem onClick={onArchiveToggle}>{project.active ? t("archive") : t("active")}</MenuItem>
      <MenuItem onClick={onTemplateToggle}>
        {project.template ? "Remove template" : "Use as a template"}
      </MenuItem>
      <MenuItem destructive onClick={onDelete}>
        {t("delete")}
      </MenuItem>
    </DropdownMenu>
  );
}
