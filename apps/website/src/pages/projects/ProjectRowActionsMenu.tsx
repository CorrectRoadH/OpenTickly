import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AppButton,
  DropdownMenu,
  IconButton,
  MenuItem,
  MenuLink,
  MenuSeparator,
  useDropdownClose,
} from "@opentoggl/web-ui";

import { MoreIcon } from "../../shared/ui/icons.tsx";
import { buildWorkspaceReportsPath } from "../../shared/lib/workspace-routing.ts";
import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";

type ProjectRowActionsMenuProps = {
  onAddMember: () => void;
  onArchiveToggle: () => void;
  onDelete: (mode: "unassign" | "reassign", reassignProjectId?: number) => void;
  onEdit: () => void;
  onTemplateToggle: () => void;
  project: GithubComTogglTogglApiInternalModelsProject;
  /** Other projects available for reassignment. */
  reassignTargets: Array<{ id: number; name: string }>;
  workspaceId: number;
};

export function ProjectRowActionsMenu({
  onAddMember,
  onArchiveToggle,
  onDelete,
  onEdit,
  onTemplateToggle,
  project,
  reassignTargets,
  workspaceId,
}: ProjectRowActionsMenuProps): ReactElement {
  return (
    <DropdownMenu
      trigger={
        <IconButton aria-label={`Actions for ${project.name}`} size="sm">
          <MoreIcon className="size-3.5" />
        </IconButton>
      }
      minWidth="180px"
    >
      <ProjectMenuContent
        onAddMember={onAddMember}
        onArchiveToggle={onArchiveToggle}
        onDelete={onDelete}
        onEdit={onEdit}
        onTemplateToggle={onTemplateToggle}
        project={project}
        reassignTargets={reassignTargets}
        workspaceId={workspaceId}
      />
    </DropdownMenu>
  );
}

function ProjectMenuContent({
  onAddMember,
  onArchiveToggle,
  onDelete,
  onEdit,
  onTemplateToggle,
  project,
  reassignTargets,
  workspaceId,
}: Omit<ProjectRowActionsMenuProps, "children">): ReactElement {
  const { t } = useTranslation("projects");
  const close = useDropdownClose();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletionMode, setDeletionMode] = useState<"unassign" | "reassign">("unassign");
  const [reassignProjectId, setReassignProjectId] = useState<number | null>(null);

  if (confirmingDelete) {
    return (
      <div className="px-3 py-2" style={{ minWidth: 280 }}>
        <p className="mb-1 text-[13px] font-medium text-white">
          {t("deleteProjectConfirm", { name: project.name })}
        </p>
        <p className="mb-3 text-[12px] text-[var(--track-text-muted)]">
          {deletionMode === "reassign"
            ? t("deleteProjectReassignWarning")
            : t("deleteProjectWarning")}
        </p>

        <div className="mb-3 flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-white">
            <input
              checked={deletionMode === "unassign"}
              name="deletion-mode"
              onChange={() => setDeletionMode("unassign")}
              type="radio"
              className="accent-[var(--track-accent)]"
            />
            {t("deletionModeUnassign")}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-white">
            <input
              checked={deletionMode === "reassign"}
              name="deletion-mode"
              onChange={() => setDeletionMode("reassign")}
              type="radio"
              className="accent-[var(--track-accent)]"
            />
            {t("deletionModeReassign")}
          </label>

          {deletionMode === "reassign" ? (
            <div className="ml-5">
              <select
                className="h-7 w-full rounded-[4px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white outline-none focus:border-[var(--track-accent)]"
                onChange={(e) => setReassignProjectId(Number(e.target.value) || null)}
                value={reassignProjectId ?? ""}
              >
                <option value="">{t("selectProject")}</option>
                {reassignTargets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <AppButton
            danger
            disabled={deletionMode === "reassign" && reassignProjectId == null}
            onClick={() => {
              onDelete(
                deletionMode,
                deletionMode === "reassign" ? (reassignProjectId ?? undefined) : undefined,
              );
              close();
            }}
            size="sm"
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
      <MenuItem onClick={onEdit}>{t("editProject")}</MenuItem>
      <MenuItem onClick={onAddMember}>{t("addMember")}</MenuItem>
      <MenuLink href={buildWorkspaceReportsPath(workspaceId, "summary", project.id)}>
        {t("viewInReports")}
      </MenuLink>
      <MenuSeparator />
      <MenuItem onClick={onArchiveToggle}>{project.active ? t("archive") : t("active")}</MenuItem>
      <MenuItem onClick={onTemplateToggle}>
        {project.template ? t("removeTemplate") : t("useAsTemplate")}
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        destructive
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
