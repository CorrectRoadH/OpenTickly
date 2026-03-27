import { type ReactElement, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { useSession } from "../../shared/session/session-context.tsx";

type IntegrationTab = "native" | "browser" | "webhooks";

function IntegrationCard({
  badge,
  children,
  description,
  icon,
  title,
}: {
  badge?: string;
  children?: ReactElement;
  description: string;
  icon: ReactElement;
  title: string;
}): ReactElement {
  return (
    <div className="flex flex-col gap-4 rounded-[12px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--track-surface)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-white">{title}</h3>
            {badge ? (
              <span className="rounded-full bg-[var(--track-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] leading-5 text-[var(--track-text-muted)]">{description}</p>
        </div>
      </div>
      {children ? <div className="mt-auto">{children}</div> : null}
    </div>
  );
}

function SectionHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}): ReactElement {
  return (
    <div className="mb-5">
      <h2 className="text-[16px] font-semibold text-white">{title}</h2>
      <p className="mt-1 max-w-[640px] text-[13px] leading-5 text-[var(--track-text-muted)]">
        {description}
      </p>
    </div>
  );
}

function comingSoonAlert(feature: string) {
  window.alert(`${feature} setup is coming soon.`);
}

function CalendarIcon(): ReactElement {
  return <TrackingIcon className="size-5 text-[var(--track-text-muted)]" name="calendar" />;
}

function IntegrationPlugIcon(): ReactElement {
  return <TrackingIcon className="size-5 text-[var(--track-text-muted)]" name="integrations" />;
}

export function IntegrationsPage(): ReactElement {
  useSession();
  const [activeTab, setActiveTab] = useState<IntegrationTab>("native");

  const tabs: { id: IntegrationTab; label: string }[] = [
    { id: "native", label: "Native integrations" },
    { id: "browser", label: "Browser extensions" },
    { id: "webhooks", label: "Webhooks" },
  ];

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="integrations-page"
    >
      {/* Header with title and tabs */}
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] items-center px-5 py-3">
          <h1 className="text-[21px] font-semibold leading-[30px] text-white">Integrations</h1>
        </div>
        <div className="flex gap-0 border-t border-[var(--track-border)] px-5">
          {tabs.map((tab) => (
            <button
              className={`relative px-4 py-3 text-[13px] font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-white"
                  : "text-[var(--track-text-muted)] hover:text-white"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
              {activeTab === tab.id ? (
                <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--track-accent)]" />
              ) : null}
            </button>
          ))}
        </div>
      </header>

      {/* Tab content */}
      <div className="overflow-y-auto">
        {activeTab === "native" ? <NativeIntegrationsTab /> : null}
        {activeTab === "browser" ? <BrowserExtensionsTab /> : null}
        {activeTab === "webhooks" ? <WebhooksTab /> : null}
      </div>
    </div>
  );
}

function NativeIntegrationsTab(): ReactElement {
  return (
    <div className="px-5 py-6">
      {/* Hero section */}
      <div className="mb-10">
        <h2 className="text-[24px] font-bold text-white">Supercharge your workflow</h2>
        <p className="mt-2 max-w-[560px] text-[14px] leading-6 text-[var(--track-text-muted)]">
          Connect apps to share data and make your workflow simpler, smarter and more powerful.
        </p>
      </div>

      {/* External calendars section */}
      <section className="mb-10">
        <SectionHeader
          description="Manage and edit external calendars. Connected calendar events are private and only you can see them."
          title="External calendars"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IntegrationCard
            badge="Private"
            description="View your time entries on your external calendar. Export your entries as an iCalendar feed to keep your schedule in sync."
            icon={<CalendarIcon />}
            title="iCalendar"
          >
            <button
              className="flex h-9 items-center gap-2 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--track-surface-muted)]"
              onClick={() => comingSoonAlert("iCalendar URL copy")}
              type="button"
            >
              <TrackingIcon className="size-3.5" name="copy" />
              Copy URL
            </button>
          </IntegrationCard>

          <IntegrationCard
            description="See your Google Calendar events alongside your time entries. Plan your day and track time without switching tabs."
            icon={<CalendarIcon />}
            title="Google Calendar"
          >
            <button
              className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition-colors hover:brightness-110"
              onClick={() => comingSoonAlert("Google Calendar")}
              type="button"
            >
              <TrackingIcon className="size-3.5" name="plus" />
              Get started
            </button>
          </IntegrationCard>

          <IntegrationCard
            description="See your Outlook Calendar events alongside your time entries. Keep everything in one place for better planning."
            icon={<CalendarIcon />}
            title="Outlook Calendar"
          >
            <button
              className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition-colors hover:brightness-110"
              onClick={() => comingSoonAlert("Outlook Calendar")}
              type="button"
            >
              <TrackingIcon className="size-3.5" name="plus" />
              Get started
            </button>
          </IntegrationCard>
        </div>
      </section>

      {/* Native integrations section */}
      <section>
        <SectionHeader
          description="Designed, built, and maintained by Toggl. These integrations connect directly with your workspace for a seamless experience."
          title="Native integrations"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IntegrationCard
            badge="New"
            description="Get time tracking reminders and start timers directly from Slack. Keep your team in the loop without leaving the conversation."
            icon={<IntegrationPlugIcon />}
            title="Slack"
          >
            <button
              className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition-colors hover:brightness-110"
              onClick={() => comingSoonAlert("Slack")}
              type="button"
            >
              <TrackingIcon className="size-3.5" name="plus" />
              Get started
            </button>
          </IntegrationCard>

          <IntegrationCard
            description="Track time on Jira issues without leaving your project board. Log hours directly from tickets and sync data automatically."
            icon={<IntegrationPlugIcon />}
            title="Jira"
          >
            <button
              className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition-colors hover:brightness-110"
              onClick={() => comingSoonAlert("Jira")}
              type="button"
            >
              <TrackingIcon className="size-3.5" name="plus" />
              Get started
            </button>
          </IntegrationCard>

          <IntegrationCard
            description="Connect your CRM workflow with time tracking. Log time against Salesforce opportunities, accounts, and cases."
            icon={<IntegrationPlugIcon />}
            title="Salesforce"
          >
            <button
              className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition-colors hover:brightness-110"
              onClick={() => comingSoonAlert("Salesforce")}
              type="button"
            >
              <TrackingIcon className="size-3.5" name="plus" />
              Get started
            </button>
          </IntegrationCard>
        </div>
      </section>
    </div>
  );
}

function BrowserExtensionsTab(): ReactElement {
  return (
    <div className="px-5 py-6">
      <div className="mb-10">
        <h2 className="text-[24px] font-bold text-white">Browser extensions</h2>
        <p className="mt-2 max-w-[560px] text-[14px] leading-6 text-[var(--track-text-muted)]">
          Track time from anywhere on the web with one-click browser extensions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IntegrationCard
          description="Start and stop timers from any website. Integrates with 100+ web tools including GitHub, Asana, Trello, and more."
          icon={<IntegrationPlugIcon />}
          title="Chrome Extension"
        >
          <button
            className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition-colors hover:brightness-110"
            onClick={() => comingSoonAlert("Chrome Extension")}
            type="button"
          >
            <TrackingIcon className="size-3.5" name="plus" />
            Get started
          </button>
        </IntegrationCard>

        <IntegrationCard
          description="Track time directly from Firefox. Works with the same web tools you already use every day."
          icon={<IntegrationPlugIcon />}
          title="Firefox Extension"
        >
          <button
            className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition-colors hover:brightness-110"
            onClick={() => comingSoonAlert("Firefox Extension")}
            type="button"
          >
            <TrackingIcon className="size-3.5" name="plus" />
            Get started
          </button>
        </IntegrationCard>
      </div>
    </div>
  );
}

function WebhooksTab(): ReactElement {
  return (
    <div className="px-5 py-6">
      <div className="mb-10">
        <h2 className="text-[24px] font-bold text-white">Webhooks</h2>
        <p className="mt-2 max-w-[560px] text-[14px] leading-6 text-[var(--track-text-muted)]">
          Set up webhooks to receive real-time notifications when events happen in your workspace.
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
          className="mt-2 flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition-colors hover:brightness-110"
          onClick={() => comingSoonAlert("Webhooks")}
          type="button"
        >
          <TrackingIcon className="size-3.5" name="plus" />
          Create webhook
        </button>
      </div>
    </div>
  );
}
