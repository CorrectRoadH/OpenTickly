import { type ReactElement } from "react";

import { useSession } from "../../shared/session/session-context.tsx";

export function WorkspaceBadge(): ReactElement {
  const session = useSession();

  return (
    <div className="rounded-[1.75rem] border border-emerald-200 bg-white/92 px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Profile</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{session.user.fullName}</p>
      <p className="mt-1 text-sm text-slate-500">{session.user.email}</p>
    </div>
  );
}
