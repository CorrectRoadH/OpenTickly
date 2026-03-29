import { type ReactElement, type ReactNode } from "react";

import {
  ChevronRightIcon,
  GoalsIcon,
  IntegrationsIcon,
  MembersIcon,
  ProjectsIcon,
  ReportsIcon,
  SubscriptionIcon,
  TimerIcon,
  TrackIcon,
} from "../../shared/ui/icons.tsx";
import { useSession } from "../../shared/session/session-context.tsx";

const iconClass = "size-4 text-[var(--track-accent)]";

const includedFeatures: { icon: ReactNode; label: string }[] = [
  { icon: <TimerIcon className={iconClass} />, label: "Unlimited time tracking" },
  { icon: <ProjectsIcon className={iconClass} />, label: "Unlimited projects" },
  { icon: <MembersIcon className={iconClass} />, label: "Unlimited team members" },
  { icon: <ReportsIcon className={iconClass} />, label: "Reports and analytics" },
  { icon: <GoalsIcon className={iconClass} />, label: "Goals and favorites" },
  { icon: <IntegrationsIcon className={iconClass} />, label: "API access" },
];

export function SubscriptionPage(): ReactElement {
  const session = useSession();
  const workspaceName = session.currentWorkspace.name;
  const organizationName = session.currentOrganization?.name ?? workspaceName;

  return (
    <div
      className="min-h-full w-full bg-[var(--track-surface)] text-white"
      data-testid="subscription-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] items-center px-5 py-3">
          <h1 className="text-[20px] font-semibold leading-[30px] text-white">Subscription</h1>
        </div>
      </header>

      <div className="mx-auto max-w-[820px] space-y-6 px-5 py-8">
        <section
          className="rounded-[12px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-6"
          data-testid="subscription-plan-card"
        >
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-[var(--track-accent)]">
              <SubscriptionIcon className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-[14px] font-semibold leading-6 text-white">Self-Hosted</h2>
                <span className="rounded-full bg-[var(--track-accent)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">
                  Free
                </span>
              </div>
              <p className="mt-1.5 text-[14px] leading-5 text-[var(--track-text-muted)]">
                You are running a self-hosted instance of OpenToggl. All features are included at no
                cost for{" "}
                <strong className="text-[var(--track-text-soft)]">{organizationName}</strong>.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-6 border-t border-[var(--track-border)] pt-5 text-[12px] text-[var(--track-text-muted)]">
            <div>
              <span className="text-[var(--track-text-soft)]">Workspace</span>{" "}
              <span className="text-white">{workspaceName}</span>
            </div>
            <div>
              <span className="text-[var(--track-text-soft)]">Plan</span>{" "}
              <span className="text-white">Unlimited</span>
            </div>
            <div>
              <span className="text-[var(--track-text-soft)]">Billing</span>{" "}
              <span className="text-white">None</span>
            </div>
          </div>
        </section>

        <section
          className="rounded-[12px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-6"
          data-testid="subscription-features-card"
        >
          <h2 className="text-[14px] font-semibold leading-6 text-white">What&apos;s included</h2>
          <p className="mt-1 text-[12px] leading-5 text-[var(--track-text-muted)]">
            Every feature is available on your self-hosted instance with no usage limits.
          </p>

          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {includedFeatures.map((feature) => (
              <li className="flex items-center gap-3" key={feature.label}>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
                  {feature.icon}
                </div>
                <span className="text-[14px] text-white">{feature.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-[12px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-6"
          data-testid="subscription-about-card"
        >
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--track-border)] bg-[var(--track-surface)]">
              <TrackIcon className="size-5 text-[var(--track-accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-semibold leading-6 text-white">OpenToggl</h2>
              <p className="mt-1.5 text-[14px] leading-5 text-[var(--track-text-muted)]">
                OpenToggl is the open-source, self-hosted alternative to Toggl Track. Your time
                tracking data stays on your own infrastructure with full control over privacy,
                backups, and customization. No subscriptions, no per-seat fees, no usage caps.
              </p>
              <a
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--track-accent)] hover:underline"
                href="https://github.com/CorrectRoadH/opentoggl"
                rel="noopener noreferrer"
                target="_blank"
              >
                View on GitHub
                <ChevronRightIcon className="size-3.5" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
