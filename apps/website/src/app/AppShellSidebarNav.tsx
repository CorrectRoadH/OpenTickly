import { Link } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";

import {
  isOverviewNavActive,
  isSectionNavActive,
  isTimerNavActive,
} from "./shell-navigation-state.ts";
import { AnimatedActiveIndicator } from "../shared/ui/AnimatedActiveIndicator.tsx";
import {
  ApprovalsIcon,
  AuditLogIcon,
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
  id: string;
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
                    item.id === "overview"
                      ? isOverviewNavActive(pathname, item.to)
                      : item.id === "timer"
                        ? isTimerNavActive(pathname, item.to)
                        : isSectionNavActive(pathname, item.to)
                  }
                  badge={item.id === "timer" ? timerBadge : item.badge}
                  disabled={item.disabled}
                  id={item.id}
                  key={`${section.title}-${item.id}`}
                  label={item.label}
                  sectionId={section.title}
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
                id={item.id}
                key={`${adminSection.title}-${item.id}`}
                label={item.label}
                sectionId={adminSection.title}
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
  id,
  label,
  sectionId,
  to,
}: {
  active: boolean;
  badge?: string;
  disabled?: boolean;
  id: string;
  label: string;
  sectionId: string;
  to?: string;
}): ReactElement {
  const content = (
    <div
      className={`relative flex h-7 items-center gap-3 rounded-[6px] px-1.5 text-[14px] font-medium transition-colors duration-[160ms] ${
        active ? "text-[var(--track-accent-text)]" : "text-[var(--track-text-muted)]"
      } ${disabled ? "opacity-55" : "hover:bg-[var(--track-surface)] hover:text-white"}`}
    >
      {active ? (
        <AnimatedActiveIndicator
          className="absolute inset-0 rounded-[6px] bg-[var(--track-accent-soft)]"
          layoutId={`shell-nav-${sectionId}`}
        />
      ) : null}
      <span className="relative z-[1]">{navIcon(id)}</span>
      <span className="relative z-[1] truncate">{label}</span>
      {badge ? (
        <span className="relative z-[1] ml-auto rounded-[8px] bg-[var(--track-border)] px-1.5 py-0.5 text-[12px] leading-none text-[var(--track-text-muted)]">
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
  overview: <OverviewIcon className={iconClass} />,
  timer: <TimerIcon className={iconClass} />,
  reports: <ReportsIcon className={iconClass} />,
  approvals: <ApprovalsIcon className={iconClass} />,
  projects: <ProjectsIcon className={iconClass} />,
  clients: <ClientsIcon className={iconClass} />,
  members: <MembersIcon className={iconClass} />,
  billableRates: <DollarIcon className={iconClass} />,
  import: <ImportIcon className={iconClass} />,
  invoices: <InvoicesIcon className={iconClass} />,
  tags: <TagsIcon className={iconClass} />,
  goals: <GoalsIcon className={iconClass} />,
  integrations: <IntegrationsIcon className={iconClass} />,
  auditLog: <AuditLogIcon className={iconClass} />,
  subscription: <SubscriptionIcon className={iconClass} />,
  settings: <SettingsIcon className={iconClass} />,
};

function navIcon(label: string): ReactNode {
  return navIconMap[label] ?? <OverviewIcon className={iconClass} />;
}
