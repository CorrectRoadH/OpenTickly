import { type ReactElement } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { useSession } from "../../shared/session/session-context.tsx";

export function IntegrationsPage(): ReactElement {
  useSession();

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="integrations-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] items-center px-5 py-3">
          <h1 className="text-[21px] font-semibold leading-[30px] text-white">Integrations</h1>
        </div>
      </header>

      <div className="overflow-y-auto">
        <div className="px-5 py-6">
          <div className="mb-10">
            <h2 className="text-[24px] font-bold text-white">Webhooks</h2>
            <p className="mt-2 max-w-[560px] text-[14px] leading-6 text-[var(--track-text-muted)]">
              Set up webhooks to receive real-time notifications when events happen in your
              workspace.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <TrackingIcon className="size-8 text-[var(--track-text-muted)]" name="integrations" />
            <h3 className="text-[16px] font-semibold text-white">No webhooks configured</h3>
            <p className="max-w-[420px] text-[13px] leading-5 text-[var(--track-text-muted)]">
              Webhooks let you build custom integrations that react to time entry, project, and
              workspace events in real time.
            </p>
            <button
              className="mt-2 flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white opacity-50 cursor-not-allowed"
              disabled
              title="Webhook management is not available"
              type="button"
            >
              <TrackingIcon className="size-3.5" name="plus" />
              Create webhook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
