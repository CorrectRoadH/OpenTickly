import type { ReactElement, ReactNode } from "react";

import { AnimatedActiveIndicator } from "./AnimatedActiveIndicator.tsx";

const tabBase =
  "relative flex h-[40px] items-center px-3 text-[14px] font-medium transition-colors duration-[160ms]";
const tabActive = "text-white";
const tabInactive = "text-[var(--track-text-muted)] hover:text-[var(--track-text-soft)]";
const tabIndicator = "absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--track-accent)]";
const tabIndicatorLayoutId = "page-layout-tab-indicator";

export function pageLayoutTabClass(active: boolean): string {
  return `${tabBase} ${active ? tabActive : tabInactive}`;
}

export { tabIndicator as pageLayoutTabIndicatorClass };

export function PageLayoutTabIndicator({
  layoutId = tabIndicatorLayoutId,
}: {
  layoutId?: string;
}): ReactElement {
  return <AnimatedActiveIndicator className={tabIndicator} layoutId={layoutId} />;
}

export type PageLayoutTab = {
  label: string;
  value: string;
};

function isPageLayoutTabArray(tabs: unknown): tabs is PageLayoutTab[] {
  return (
    Array.isArray(tabs) &&
    tabs.length > 0 &&
    typeof tabs[0] === "object" &&
    tabs[0] !== null &&
    "value" in tabs[0] &&
    "label" in tabs[0]
  );
}

type PageLayoutProps = {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  toolbar?: ReactNode;
  tabs?: PageLayoutTab[] | ReactNode;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  bulkActionsBar?: ReactNode;
  composer?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  "data-testid"?: string;
  "data-tabs-testid"?: string;
};

export function PageLayout({
  title,
  subtitle,
  headerActions,
  toolbar,
  tabs,
  activeTab,
  onTabChange,
  bulkActionsBar,
  composer,
  children,
  footer,
  "data-testid": testId,
  "data-tabs-testid": tabsTestId,
}: PageLayoutProps): ReactElement {
  return (
    <div className="flex h-full flex-col" data-testid={testId}>
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="space-y-1">
            <h1 className="text-[20px] font-semibold leading-[30px] text-white">{title}</h1>
            {subtitle ? (
              <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">{subtitle}</p>
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
          ) : null}
        </div>
      </header>

      {toolbar ? (
        <div className="flex min-h-[48px] flex-wrap items-center gap-2 border-b border-[var(--track-border)] px-5 py-2">
          {toolbar}
        </div>
      ) : null}

      {tabs ? (
        <div
          className="flex h-[40px] items-end gap-0 border-b border-[var(--track-border)] px-5"
          data-testid={tabsTestId}
        >
          {isPageLayoutTabArray(tabs)
            ? tabs.map((tab) => (
                <button
                  key={tab.value}
                  className={pageLayoutTabClass(activeTab === tab.value)}
                  onClick={() => onTabChange?.(tab.value)}
                  type="button"
                >
                  {tab.label}
                  {activeTab === tab.value ? <PageLayoutTabIndicator /> : null}
                </button>
              ))
            : tabs}
        </div>
      ) : null}

      {bulkActionsBar ?? null}
      {composer ?? null}

      <div className="flex-1 overflow-y-auto">{children}</div>

      {footer ?? null}
    </div>
  );
}
