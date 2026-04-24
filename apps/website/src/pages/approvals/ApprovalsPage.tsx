import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@opentickly/web-ui";

import { useSession } from "../../shared/session/session-context.tsx";
import { ApprovalsIcon } from "../../shared/ui/icons.tsx";
import { FeatureWipNotice } from "../../shared/ui/FeatureWipNotice.tsx";

export function ApprovalsPage(): ReactElement {
  const { t } = useTranslation("approvals");
  useSession();

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="approvals-page"
    >
      <PageHeader bordered title={t("approvals")} />
      <div className="px-5 py-6">
        <FeatureWipNotice
          description="Approve and manage team timesheets submitted by your workspace members for review."
          icon={<ApprovalsIcon className="size-6 text-[var(--track-text-muted)]" />}
          title={t("timesheetApprovals")}
        />
      </div>
    </div>
  );
}
