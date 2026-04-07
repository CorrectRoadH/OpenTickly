import { PageHeader } from "@opentoggl/web-ui";
import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "../../shared/session/session-context.tsx";
import { FeatureWipNotice } from "../../shared/ui/FeatureWipNotice.tsx";
import { InvoicesIcon } from "../../shared/ui/icons.tsx";

export function InvoicesPage(): ReactElement {
  const { t } = useTranslation("invoices");
  useSession();

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="invoices-page"
    >
      <PageHeader bordered title={t("invoicesPageTitle")} />
      <div className="px-5 py-6">
        <FeatureWipNotice
          description={t("invoicesPageDescription")}
          icon={<InvoicesIcon className="size-6 text-[var(--track-text-muted)]" />}
          title={t("invoicesPageTitle")}
        />
      </div>
    </div>
  );
}
