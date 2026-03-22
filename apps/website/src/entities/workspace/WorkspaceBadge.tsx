import { type ReactElement } from "react";

import { useSession } from "../../shared/session/session-context.tsx";

export function WorkspaceBadge(): ReactElement {
  const session = useSession();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs font-medium text-slate-400">Signed in as</p>
      <p className="mt-2 truncate text-sm font-semibold text-white">{session.user.fullName}</p>
      <p className="mt-1 truncate text-sm text-slate-400">{session.user.email}</p>
    </div>
  );
}
