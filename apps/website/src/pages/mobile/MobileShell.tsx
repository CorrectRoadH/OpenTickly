import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { type ReactElement, useEffect } from "react";

import { resolveEntryDurationSeconds } from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { useCurrentTimeEntryQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { CalendarIcon, ProfileIcon, ReportsIcon, TimerIcon } from "../../shared/ui/icons.tsx";
import { MobileTimerComposer } from "./MobileTimerComposer.tsx";
import { OfflineBanner } from "./OfflineBanner.tsx";
import { PwaInstallBanner } from "./PwaInstallBanner.tsx";

export function MobileShell(): ReactElement {
  const { t } = useTranslation("mobile");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const TABS = [
    { path: "/m/timer", label: t("timer"), Icon: TimerIcon },
    { path: "/m/calendar", label: t("calendar"), Icon: CalendarIcon },
    { path: "/m/report", label: t("report"), Icon: ReportsIcon },
    { path: "/m/me", label: t("me"), Icon: ProfileIcon },
  ];
  const session = useSession();
  const currentTimeEntryQuery = useCurrentTimeEntryQuery();
  const runningEntry = currentTimeEntryQuery.data;
  const { showTimeInTitle } = useUserPreferences();

  // Update document.title every second when a timer is running (no re-render).
  useEffect(() => {
    if (!runningEntry || !showTimeInTitle) {
      document.title = "OpenTickly";
      return;
    }
    function updateTitle() {
      const seconds = resolveEntryDurationSeconds(runningEntry!, Date.now());
      const h = Math.floor(seconds / 3600);
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      document.title = `${h}:${m}:${s} \u00B7 OpenTickly`;
    }
    updateTitle();
    const id = setInterval(updateTitle, 1000);
    return () => {
      clearInterval(id);
      document.title = "OpenTickly";
    };
  }, [runningEntry, showTimeInTitle]);

  return (
    <div
      className="flex h-[100dvh] flex-col bg-[var(--track-surface)] text-[var(--track-text)]"
      data-testid="app-shell"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <OfflineBanner />
      <PwaInstallBanner />
      {/* Page content */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </div>

      <MobileTimerComposer runningEntry={runningEntry} workspaceId={session.currentWorkspace.id} />

      {/* Bottom tab bar */}
      <nav className="flex border-t border-[var(--track-border)] bg-[var(--track-panel)] pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ path, label, Icon }) => {
          const active = pathname.startsWith(path);
          return (
            <Link
              key={path}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                active ? "text-[var(--track-accent)]" : "text-[var(--track-text-muted)]"
              }`}
              to={path}
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
