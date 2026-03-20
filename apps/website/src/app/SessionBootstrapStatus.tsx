import { type ReactElement } from "react";

import { useSession } from "../shared/session/session-context.tsx";
import { StatusPill } from "../shared/ui/StatusPill.tsx";

// This stays in app because it only reports app bootstrap/session readiness and
// does not own any user action flow that would justify a feature boundary.
export function SessionBootstrapStatus(): ReactElement {
  const session = useSession();

  return (
    <div className="flex flex-col gap-2">
      <StatusPill tone="success">Session ready</StatusPill>
      <p className="text-sm leading-6 text-slate-600">
        Bootstrapped as {session.user.email} in{" "}
        <span className="font-medium text-slate-900">{session.currentWorkspace.name}</span>
      </p>
    </div>
  );
}
