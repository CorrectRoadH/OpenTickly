import { type ReactElement } from "react";

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
  return (
    <section className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Project members
      </p>

      {isPending ? <p className="mt-2 text-sm text-slate-600">Loading members…</p> : null}
      {isError ? <p className="mt-2 text-sm text-rose-700">Unable to load members.</p> : null}

      {!isPending && !isError ? (
        members.length > 0 ? (
          <ul className="mt-2 space-y-2" aria-label={`${project.name} members`}>
            {members.map((member) => (
              <li
                key={`${member.project_id}-${member.user_id}-${member.role}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-xs text-slate-700"
              >
                <span className="font-semibold text-slate-900">Member {member.user_id}</span>
                <span>Project {member.project_id}</span>
                <span>{formatProjectMemberRole(member.role ?? "member")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No members assigned</p>
        )
      ) : null}
    </section>
  );
}
