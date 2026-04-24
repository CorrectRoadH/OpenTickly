import { type ReactElement, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

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

function IncludedFeatures({
  t,
}: {
  t: (key: string) => string;
}): { icon: ReactNode; label: string }[] {
  return [
    { icon: <TimerIcon className={iconClass} />, label: t("unlimitedTimeTracking") },
    { icon: <ProjectsIcon className={iconClass} />, label: t("unlimitedProjects") },
    { icon: <MembersIcon className={iconClass} />, label: t("unlimitedTeamMembers") },
    { icon: <ReportsIcon className={iconClass} />, label: t("reportsAndAnalytics") },
    { icon: <GoalsIcon className={iconClass} />, label: t("goalsAndFavorites") },
    { icon: <IntegrationsIcon className={iconClass} />, label: t("apiAccess") },
  ];
}

export function SubscriptionPage(): ReactElement {
  const { t } = useTranslation("subscription");
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
          <h1 className="text-[20px] font-semibold leading-[30px] text-white">
            {t("subscription")}
          </h1>
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
              <h2 className="text-[14px] font-semibold leading-6 text-white">{t("selfHosted")}</h2>
              <p className="mt-1.5 text-[14px] leading-5 text-[var(--track-text-muted)]">
                {t("selfHostedDescription", { organizationName })}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-6 border-t border-[var(--track-border)] pt-5 text-[12px] text-[var(--track-text-muted)]">
            <div>
              <span className="text-[var(--track-text-soft)]">{t("workspace")}</span>{" "}
              <span className="text-white">{workspaceName}</span>
            </div>
            <div>
              <span className="text-[var(--track-text-soft)]">{t("access")}</span>{" "}
              <span className="text-white">{t("allFeaturesIncluded")}</span>
            </div>
            <div>
              <span className="text-[var(--track-text-soft)]">{t("billing")}</span>{" "}
              <span className="text-white">{t("none")}</span>
            </div>
          </div>
        </section>

        <section
          className="rounded-[12px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-6"
          data-testid="subscription-features-card"
        >
          <h2 className="text-[14px] font-semibold leading-6 text-white">{t("whatsIncluded")}</h2>
          <p className="mt-1 text-[12px] leading-5 text-[var(--track-text-muted)]">
            {t("whatsIncludedDescription")}
          </p>

          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {IncludedFeatures({ t }).map((feature) => (
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
              <h2 className="text-[14px] font-semibold leading-6 text-white">{t("opentoggl")}</h2>
              <p className="mt-1.5 text-[14px] leading-5 text-[var(--track-text-muted)]">
                {t("opentogglDescription")}
              </p>
              <a
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--track-accent)] hover:underline"
                href="https://github.com/CorrectRoadH/OpenTickly"
                rel="noopener noreferrer"
                target="_blank"
              >
                {t("viewOnGithub")}
                <ChevronRightIcon className="size-3.5" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
