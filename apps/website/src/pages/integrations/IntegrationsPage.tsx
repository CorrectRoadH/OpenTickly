import { PageHeader } from "@opentoggl/web-ui";
import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "../../shared/session/session-context.tsx";
import { FeatureWipNotice } from "../../shared/ui/FeatureWipNotice.tsx";
import { IntegrationsIcon } from "../../shared/ui/icons.tsx";

export function IntegrationsPage(): ReactElement {
  const { t } = useTranslation("integrations");
  useSession();

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="integrations-page"
    >
      <PageHeader bordered title={t("integrations")} />
      <div className="px-5 py-6">
        <FeatureWipNotice
          description={t("webhooksDescription")}
          icon={<IntegrationsIcon className="size-6 text-[var(--track-text-muted)]" />}
          title={t("webhooks")}
        />
      </div>
    </div>
  );
}
