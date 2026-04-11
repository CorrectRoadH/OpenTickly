import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { type ReactElement, useEffect, useState } from "react";

import { resolveEntryDurationSeconds } from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { LiveDuration } from "../../features/tracking/LiveDuration.tsx";
import {
  useCurrentTimeEntryQuery,
  useStartTimeEntryMutation,
  useStopTimeEntryMutation,
  useTimeEntriesQuery,
} from "../../shared/query/web-shell.ts";
import { resolveTimeEntryProjectId } from "../../features/tracking/time-entry-ids.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import {
  CalendarIcon,
  PlayIcon,
  ProfileIcon,
  ReportsIcon,
  TimerIcon,
} from "../../shared/ui/icons.tsx";
import { TimerActionButton } from "../../shared/ui/TimerActionButton.tsx";
import { MobileTimeEntryEditor } from "./MobileTimeEntryEditor.tsx";
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
  const startMutation = useStartTimeEntryMutation(session.currentWorkspace.id);
  const stopMutation = useStopTimeEntryMutation();
  const runningEntry = currentTimeEntryQuery.data;
  const { showTimeInTitle } = useUserPreferences();

  // Fetch recent entries for continue suggestions
  const recentEntriesDateRange = (() => {
    const end = new Date();
    end.setDate(end.getDate() + 1);
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  })();
  const recentEntriesQuery = useTimeEntriesQuery(recentEntriesDateRange);
  const recentStoppedEntries = (() => {
    const entries = recentEntriesQuery.data ?? [];
    // Deduplicate by description+project, keep most recent, exclude running
    const seen = new Set<string>();
    return entries
      .filter((e) => e.stop && e.description?.trim())
      .sort((a, b) => new Date(b.stop!).getTime() - new Date(a.stop!).getTime())
      .filter((e) => {
        const key = `${e.description?.trim()}::${resolveTimeEntryProjectId(e)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
  })();

  const [draftDescription, setDraftDescription] = useState("");
  const [editingEntry, setEditingEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);

  // Update document.title every second when a timer is running (no re-render).
  useEffect(() => {
    if (!runningEntry || !showTimeInTitle) {
      document.title = "OpenToggl";
      return;
    }
    function updateTitle() {
      const seconds = resolveEntryDurationSeconds(runningEntry!, Date.now());
      const h = Math.floor(seconds / 3600);
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      document.title = `${h}:${m}:${s} \u00B7 OpenToggl`;
    }
    updateTitle();
    const id = setInterval(updateTitle, 1000);
    return () => {
      clearInterval(id);
      document.title = "OpenToggl";
    };
  }, [runningEntry, showTimeInTitle]);

  function handleStop() {
    if (!runningEntry?.id) return;
    void stopMutation.mutateAsync({
      workspaceId: session.currentWorkspace.id,
      timeEntryId: runningEntry.id,
    });
  }

  function handleStart() {
    void startMutation.mutateAsync({
      description: draftDescription.trim(),
      start: new Date().toISOString(),
    });
    setDraftDescription("");
  }

  function handleContinue(entry: GithubComTogglTogglApiInternalModelsTimeEntry) {
    void startMutation.mutateAsync({
      billable: entry.billable,
      description: (entry.description ?? "").trim(),
      projectId: resolveTimeEntryProjectId(entry),
      start: new Date().toISOString(),
      tagIds: entry.tag_ids ?? [],
    });
  }

  return (
    <div
      className="flex h-[100dvh] flex-col bg-[var(--track-surface)] text-[var(--track-text)]"
      data-testid="app-shell"
    >
      <OfflineBanner />
      <PwaInstallBanner />
      {editingEntry ? (
        <MobileTimeEntryEditor entry={editingEntry} onClose={() => setEditingEntry(null)} />
      ) : null}
      {/* Page content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>

      {/* Timer composer bar */}
      <div className="border-t border-[var(--track-border)] bg-[var(--track-panel)] px-4 py-2">
        {runningEntry ? (
          <div className="flex items-center gap-3">
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => setEditingEntry(runningEntry)}
              type="button"
            >
              <p className="truncate text-[13px] font-medium text-white">
                {runningEntry.description || t("noDescription")}
              </p>
              {runningEntry.project_name || runningEntry.tags?.length ? (
                <p className="flex items-center gap-1 truncate text-[11px] text-[var(--track-text-muted)]">
                  {runningEntry.project_name ? (
                    <>
                      <span
                        className="inline-block size-[6px] shrink-0 rounded-full"
                        style={{
                          backgroundColor: runningEntry.project_color ?? "var(--track-text-muted)",
                        }}
                      />
                      <span className="truncate">{runningEntry.project_name}</span>
                    </>
                  ) : null}
                  {runningEntry.tags?.length ? (
                    <>
                      {runningEntry.project_name ? <span>·</span> : null}
                      <span className="truncate">{runningEntry.tags.join(", ")}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
              {runningEntry ? (
                <LiveDuration
                  className="text-[12px] tabular-nums text-[var(--track-accent)]"
                  entry={runningEntry}
                />
              ) : null}
            </button>
            <TimerActionButton isRunning onClick={handleStop} size="sm" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                className="min-w-0 flex-1 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 text-[14px] text-white placeholder-[var(--track-text-muted)] outline-none focus:border-[var(--track-accent)]"
                onChange={(e) => setDraftDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStart();
                }}
                placeholder={t("whatAreYouWorkingOn")}
                value={draftDescription}
              />
              <TimerActionButton isRunning={false} onClick={handleStart} size="sm" />
            </div>
            {!draftDescription ? (
              recentStoppedEntries.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto">
                  {recentStoppedEntries.map((entry) => (
                    <button
                      aria-label={t("continueEntry", { description: entry.description })}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--track-border)] px-3 py-1 text-left transition active:bg-white/4"
                      key={entry.id}
                      onClick={() => handleContinue(entry)}
                      type="button"
                    >
                      <PlayIcon className="size-3 shrink-0 text-[var(--track-text-muted)]" />
                      {entry.project_color ? (
                        <span
                          className="inline-block size-[6px] shrink-0 rounded-full"
                          style={{ backgroundColor: entry.project_color }}
                        />
                      ) : null}
                      <span className="max-w-[120px] truncate text-[12px] text-white">
                        {entry.description}
                      </span>
                    </button>
                  ))}
                </div>
              ) : recentEntriesQuery.isSuccess ? (
                <p className="text-center text-[12px] text-[var(--track-text-muted)]">
                  {t("noRecentEntries")}
                </p>
              ) : null
            ) : null}
          </div>
        )}
      </div>

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
