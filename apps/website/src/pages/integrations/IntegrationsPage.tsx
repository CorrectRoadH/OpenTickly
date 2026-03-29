import { PageHeader } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

import { useSession } from "../../shared/session/session-context.tsx";
import { FeatureWipNotice } from "../../shared/ui/FeatureWipNotice.tsx";
import { IntegrationsIcon } from "../../shared/ui/icons.tsx";

export function IntegrationsPage(): ReactElement {
  useSession();

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="integrations-page"
    >
      <PageHeader bordered title="Integrations" />
      <div className="px-5 py-6">
        <FeatureWipNotice
          description="Set up webhooks to receive real-time notifications when events happen in your workspace. Webhook management is being built."
          icon={<IntegrationsIcon className="size-6 text-[var(--track-text-muted)]" />}
          title="Webhooks"
        />
      </div>
    </div>
  );
}
