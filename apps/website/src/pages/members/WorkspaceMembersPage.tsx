import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

import { useSession } from "../../shared/session/session-context.tsx";

const sampleMembers = [
  { id: 1, name: "Alex North", role: "Admin" },
  { id: 2, name: "Jamie Lee", role: "Member" },
  { id: 3, name: "Samira Chen", role: "Member" },
];

export function WorkspaceMembersPage(): ReactElement {
  const session = useSession();

  return (
    <AppPanel className="bg-white/95">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Team
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Workspace Members
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            Viewing members for {session.currentWorkspace.name}.
          </p>
        </div>
        <AppButton type="button">Invite members</AppButton>
      </div>

      <ul className="mt-6 divide-y divide-slate-200" aria-label="Workspace members list">
        {sampleMembers.map((member) => (
          <li key={member.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{member.name}</p>
              <p className="text-xs text-slate-600">{member.role}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Active
            </span>
          </li>
        ))}
      </ul>
    </AppPanel>
  );
}
