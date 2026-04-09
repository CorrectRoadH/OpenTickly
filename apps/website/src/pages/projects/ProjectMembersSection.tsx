import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import type {
  GithubComTogglTogglApiInternalModelsProject,
  ModelsProjectUser,
} from "../../shared/api/generated/public-track/types.gen.ts";

function formatProjectMemberRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

type ProjectMembersSectionProps = {
  isError: boolean;
  isPending: boolean;
  members: Array<ModelsProjectUser>;
  project: GithubComTogglTogglApiInternalModelsProject;
};

export function ProjectMembersSection({
  isError,
  isPending,
  members,
  project,
}: ProjectMembersSectionProps): ReactElement {
  const { t } = useTranslation("projects");
  return (
    <section className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {t("projectMembers")}
      </p>

      {isPending ? (
        <p className="mt-2 text-sm text-slate-600">{t("loadingMembersEllipsis")}</p>
      ) : null}
      {isError ? <p className="mt-2 text-sm text-rose-700">{t("unableToLoadMembers")}</p> : null}

      {!isPending && !isError ? (
        members.length > 0 ? (
          <ul className="mt-2 space-y-2" aria-label={`${project.name} members`}>
            {members.map((member) => (
              <li
                key={`${member.project_id}-${member.user_id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-xs text-slate-700"
              >
                <span className="font-semibold text-slate-900">
                  {t("memberUserId", { userId: member.user_id })}
                </span>
                <span>{t("projectIdLabel", { projectId: member.project_id })}</span>
                <span>{formatProjectMemberRole(member.manager ? "manager" : "member")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">{t("noMembersAssignedShort")}</p>
        )
      ) : null}
    </section>
  );
}
