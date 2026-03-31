import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { type ReactElement, useEffect, useMemo, useState } from "react";

import {
  formatClockDuration,
  resolveEntryDurationSeconds,
} from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import {
  useCurrentTimeEntryQuery,
  useStartTimeEntryMutation,
  useStopTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { CalendarIcon, ProfileIcon, ReportsIcon, TimerIcon } from "../../shared/ui/icons.tsx";
import { TimerActionButton } from "../../shared/ui/TimerActionButton.tsx";
import { MobileTimeEntryEditor } from "./MobileTimeEntryEditor.tsx";
import { OfflineBanner } from "./OfflineBanner.tsx";
import { PwaInstallBanner } from "./PwaInstallBanner.tsx";

const TABS = [
  { path: "/m/timer", label: "Timer", Icon: TimerIcon },
  { path: "/m/calendar", label: "Calendar", Icon: CalendarIcon },
  { path: "/m/report", label: "Report", Icon: ReportsIcon },
  { path: "/m/me", label: "Me", Icon: ProfileIcon },
] as const;

export function MobileShell(): ReactElement {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { durationFormat } = useUserPreferences();
  const session = useSession();
  const currentTimeEntryQuery = useCurrentTimeEntryQuery();
  const startMutation = useStartTimeEntryMutation(session.currentWorkspace.id);
  const stopMutation = useStopTimeEntryMutation();
  const runningEntry = currentTimeEntryQuery.data;

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [draftDescription, setDraftDescription] = useState("");
  const [editingEntry, setEditingEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);

  useEffect(() => {
    if (!runningEntry) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [runningEntry]);

  useEffect(() => {
    if (!runningEntry) {
      document.title = "OpenToggl";
      return;
    }
    const seconds = resolveEntryDurationSeconds(runningEntry, nowMs);
    const h = Math.floor(seconds / 3600);
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    document.title = `${h}:${m}:${s} \u00B7 OpenToggl`;
  }, [runningEntry, nowMs]);

  const timerLabel = useMemo(() => {
    if (!runningEntry) return undefined;
    return formatClockDuration(resolveEntryDurationSeconds(runningEntry, nowMs), durationFormat);
  }, [runningEntry, nowMs, durationFormat]);

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

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--track-surface)] text-[var(--track-text)]">
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
                {runningEntry.description || "No description"}
              </p>
              <p className="text-[12px] tabular-nums text-[var(--track-accent)]">{timerLabel}</p>
            </button>
            <TimerActionButton isRunning onClick={handleStop} size="sm" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              className="min-w-0 flex-1 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 text-[14px] text-white placeholder-[var(--track-text-muted)] outline-none focus:border-[var(--track-accent)]"
              onChange={(e) => setDraftDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleStart();
              }}
              placeholder="What are you working on?"
              value={draftDescription}
            />
            <TimerActionButton isRunning={false} onClick={handleStart} size="sm" />
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
