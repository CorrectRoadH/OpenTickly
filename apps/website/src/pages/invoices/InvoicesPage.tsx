import { PageHeader } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

import { useSession } from "../../shared/session/session-context.tsx";
import { FeatureWipNotice } from "../../shared/ui/FeatureWipNotice.tsx";
import { InvoicesIcon } from "../../shared/ui/icons.tsx";

export function InvoicesPage(): ReactElement {
  useSession();

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="invoices-page"
    >
      <PageHeader bordered title="Invoices" />
      <div className="px-5 py-6">
        <FeatureWipNotice
          description="Create and manage invoices for your clients directly from tracked time entries and project data."
          icon={<InvoicesIcon className="size-6 text-[var(--track-text-muted)]" />}
          title="Invoices"
        />
      </div>
    </div>
  );
}
