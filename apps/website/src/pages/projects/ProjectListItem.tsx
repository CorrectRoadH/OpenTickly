import { AppButton } from "@opentickly/web-ui";
import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import type {
  GithubComTogglTogglApiInternalModelsProject,
  ModelsProjectUser,
} from "../../shared/api/generated/public-track/types.gen.ts";
import { useProjectMembersQuery } from "../../shared/query/web-shell.ts";
import {
  buildProjectTasksPath,
  buildProjectTeamPath,
} from "../../shared/url-state/projects-location.ts";
import { ProjectMembersSection } from "./ProjectMembersSection.tsx";

type ProjectListItemProps = {
  mutationPending: boolean;
  onArchiveToggle: (project: GithubComTogglTogglApiInternalModelsProject) => Promise<void>;
  onPinToggle: (project: GithubComTogglTogglApiInternalModelsProject) => Promise<void>;
  project: GithubComTogglTogglApiInternalModelsProject;
  workspaceId: number;
};

export function ProjectListItem({
  mutationPending,
  onArchiveToggle,
  onPinToggle,
  project,
  workspaceId,
}: ProjectListItemProps): ReactElement {
  const { t } = useTranslation("projects");
  const projectMembersQuery = useProjectMembersQuery(workspaceId, project.id ?? 0);
  const projectMembers = normalizeProjectMembers(projectMembersQuery.data);
  const memberCount = projectMembers.length;
  const statusLabel = project.active ? t("active") : t("archived");
  const templateLabel = project.template ? t("template") : t("standard");

  return (
    <li aria-label={`Project ${project.name}`} className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{project.name}</p>
            <span className="rounded-lg border border-white/10 bg-[var(--track-input-bg)] px-3 py-1 text-xs font-medium text-slate-300">
              {statusLabel}
            </span>
            <span className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
              {templateLabel}
            </span>
            {project.pinned ? (
              <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                {t("pinned")}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-400">
            {t("projectWithStatus", { status: statusLabel })}
          </p>
          <p className="text-[11px] text-slate-500">
            {t("workspaceWidMembers", { wid: project.wid, count: memberCount })}
          </p>
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span>
              {t("client")} {project.client_name ?? t("unassigned")}
            </span>
            <span>
              {t("actual")} {project.actual_seconds ?? 0}s
            </span>
            <span>
              {t("period")} {project.recurring ? t("recurring") : t("none")}
              {project.current_period?.start_date && project.current_period?.end_date
                ? ` · ${project.current_period.start_date} to ${project.current_period.end_date}`
                : ""}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            aria-label={`${t("projectDetails")} for ${project.name}`}
            className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/8"
            href={buildProjectTeamPath(workspaceId, project.id ?? 0)}
          >
            {t("projectDetails")}
          </a>
          <a
            aria-label={`${t("projectTasks")} for ${project.name}`}
            className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/8"
            href={buildProjectTasksPath(workspaceId, project.id ?? 0)}
          >
            {t("projectTasks")}
          </a>
          <AppButton
            disabled={mutationPending}
            onClick={() => void onPinToggle(project)}
            type="button"
          >
            <span className="sr-only">
              {project.pinned
                ? t("unpinProjectAction", { name: project.name })
                : t("pinProjectAction", { name: project.name })}
            </span>
            <span aria-hidden="true">{project.pinned ? t("unpin") : t("pin")}</span>
          </AppButton>
          <AppButton
            disabled={mutationPending}
            onClick={() => void onArchiveToggle(project)}
            type="button"
          >
            <span className="sr-only">
              {project.active
                ? t("archiveProjectAction", { name: project.name })
                : t("restoreProjectAction", { name: project.name })}
            </span>
            <span aria-hidden="true">{project.active ? t("archive") : t("restore")}</span>
          </AppButton>
        </div>
      </div>

      <ProjectMembersSection
        isError={projectMembersQuery.isError}
        isPending={projectMembersQuery.isPending}
        members={projectMembers}
        project={project}
      />
    </li>
  );
}

function normalizeProjectMembers(data: unknown): Array<ModelsProjectUser> {
  if (Array.isArray(data)) {
    return data as Array<ModelsProjectUser>;
  }

  if (hasMembersArray(data)) {
    return data.members;
  }

  return [];
}

function hasMembersArray(value: unknown): value is { members: Array<ModelsProjectUser> } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as { members?: unknown }).members)
  );
}
