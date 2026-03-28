import { Link } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";

import {
  isOverviewNavActive,
  isSectionNavActive,
  isTimerNavActive,
} from "./shell-navigation-state.ts";
import {
  ApprovalsIcon,
  ClientsIcon,
  DollarIcon,
  GoalsIcon,
  ImportIcon,
  IntegrationsIcon,
  InvoicesIcon,
  MembersIcon,
  OverviewIcon,
  ProjectsIcon,
  ReportsIcon,
  SettingsIcon,
  SubscriptionIcon,
  TagsIcon,
  TimerIcon,
} from "../shared/ui/icons.tsx";

export type NavSection = {
  items: NavItem[];
  title: string;
};

type NavItem = {
  badge?: string;
  disabled?: boolean;
  label: string;
  to?: string;
};

export function SidebarNavSections({
  adminSection,
  pathname,
  primarySections,
  timerBadge,
}: {
  adminSection: NavSection | undefined;
  pathname: string;
  primarySections: NavSection[];
  timerBadge?: string;
}): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav
        aria-label="Primary"
        className="min-h-0 flex-1 overflow-y-auto px-0 pb-4 pt-6"
        data-testid="shell-primary-nav"
      >
        {primarySections.map((section) => (
          <section key={section.title} className="mb-6">
            <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              {section.title}
            </h2>
            <div className="mt-2 space-y-0.5">
              {section.items.map((item) => (
                <ShellNavItem
                  active={
                    item.label === "Overview"
                      ? isOverviewNavActive(pathname, item.to)
                      : item.label === "Timer"
                        ? isTimerNavActive(pathname, item.to)
                        : isSectionNavActive(pathname, item.to)
                  }
                  badge={item.label === "Timer" ? timerBadge : item.badge}
                  disabled={item.disabled}
                  key={`${section.title}-${item.label}`}
                  label={item.label}
                  to={item.to}
                />
              ))}
            </div>
          </section>
        ))}
      </nav>

      {adminSection ? (
        <section className="sticky bottom-0 bg-[var(--track-panel)] px-0 pb-[15px] pt-3">
          <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            {adminSection.title}
          </h2>
          <div className="mt-2 space-y-0.5">
            {adminSection.items.map((item) => (
              <ShellNavItem
                active={isSectionNavActive(pathname, item.to)}
                badge={item.badge}
                disabled={item.disabled}
                key={`${adminSection.title}-${item.label}`}
                label={item.label}
                to={item.to}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ShellNavItem({
  active,
  badge,
  disabled = false,
  label,
  to,
}: {
  active: boolean;
  badge?: string;
  disabled?: boolean;
  label: string;
  to?: string;
}): ReactElement {
  const content = (
    <div
      className={`flex h-7 items-center gap-3 rounded-[6px] px-1.5 text-[14px] font-medium ${
        active
          ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
          : "text-[var(--track-text-muted)]"
      } ${disabled ? "opacity-55" : "hover:bg-[var(--track-surface)] hover:text-white"}`}
    >
      {navIcon(label)}
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-[8px] bg-[var(--track-border)] px-1.5 py-0.5 text-[12px] leading-none text-[var(--track-text-muted)]">
          {badge}
        </span>
      ) : null}
    </div>
  );

  if (!to || disabled) {
    return <div className="px-2">{content}</div>;
  }

  return (
    <Link aria-current={active ? "page" : undefined} className="block px-2" to={to}>
      {content}
    </Link>
  );
}

const iconClass = "h-4 w-[14px] shrink-0";

const navIconMap: Record<string, ReactNode> = {
  Overview: <OverviewIcon className={iconClass} />,
  Timer: <TimerIcon className={iconClass} />,
  Reports: <ReportsIcon className={iconClass} />,
  Approvals: <ApprovalsIcon className={iconClass} />,
  Projects: <ProjectsIcon className={iconClass} />,
  Clients: <ClientsIcon className={iconClass} />,
  Members: <MembersIcon className={iconClass} />,
  "Billable rates": <DollarIcon className={iconClass} />,
  Import: <ImportIcon className={iconClass} />,
  Invoices: <InvoicesIcon className={iconClass} />,
  Tags: <TagsIcon className={iconClass} />,
  Goals: <GoalsIcon className={iconClass} />,
  Integrations: <IntegrationsIcon className={iconClass} />,
  Subscription: <SubscriptionIcon className={iconClass} />,
  Settings: <SettingsIcon className={iconClass} />,
};

function navIcon(label: string): ReactNode {
  return navIconMap[label] ?? <OverviewIcon className={iconClass} />;
}
