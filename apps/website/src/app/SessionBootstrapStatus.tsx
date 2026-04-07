import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "../shared/session/session-context.tsx";
import { StatusPill } from "../shared/ui/StatusPill.tsx";

// This stays in app because it only reports app bootstrap/session readiness and
// does not own any user action flow that would justify a feature boundary.
export function SessionBootstrapStatus(): ReactElement {
  const { t } = useTranslation("appShell");
  const session = useSession();

  return (
    <div className="flex flex-col gap-2">
      <StatusPill tone="success">{t("sessionReady")}</StatusPill>
      <p className="text-sm leading-6 text-slate-400">
        Bootstrapped as {session.user.email} in{" "}
        <span className="font-medium text-slate-100">{session.currentWorkspace.name}</span>
      </p>
    </div>
  );
}
