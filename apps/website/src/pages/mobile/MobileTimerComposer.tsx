import { useTranslation } from "react-i18next";
import { type ReactElement, useState } from "react";
import { toast } from "sonner";

import { LiveDuration } from "../../features/tracking/LiveDuration.tsx";
import { resolveTimeEntryProjectId } from "../../features/tracking/time-entry-ids.ts";
import { getRecentTimeEntryRange } from "../../features/tracking/resolve-query-range.ts";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useStartTimeEntryMutation,
  useStopTimeEntryMutation,
  useTimeEntriesQuery,
} from "../../shared/query/web-shell.ts";
import { PlayIcon } from "../../shared/ui/icons.tsx";
import { TimerActionButton } from "../../shared/ui/TimerActionButton.tsx";
import { MobileTimeEntryEditor } from "./MobileTimeEntryEditor.tsx";

type MobileTimerComposerProps = {
  runningEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined;
  workspaceId: number;
};

export function MobileTimerComposer({
  runningEntry,
  workspaceId,
}: MobileTimerComposerProps): ReactElement {
  const { t } = useTranslation("mobile");
  const { t: toastT } = useTranslation("toast");
  const startMutation = useStartTimeEntryMutation(workspaceId);
  const stopMutation = useStopTimeEntryMutation();
  const recentEntriesQuery = useTimeEntriesQuery({
    ...getRecentTimeEntryRange(7),
    workspaceId,
  });
  const [draftDescription, setDraftDescription] = useState("");
  const [editingEntry, setEditingEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);

  const recentStoppedEntries = (() => {
    const seen = new Set<string>();
    return (recentEntriesQuery.data ?? [])
      .filter((entry) => entry.stop && entry.description?.trim())
      .sort((a, b) => new Date(b.stop!).getTime() - new Date(a.stop!).getTime())
      .filter((entry) => {
        const key = `${entry.description?.trim()}::${resolveTimeEntryProjectId(entry)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
  })();

  function reportFailure() {
    toast.error(toastT("failedToSaveTimeEntry"));
  }

  function handleStop() {
    if (!runningEntry?.id || stopMutation.isPending) return;
    void stopMutation
      .mutateAsync({ workspaceId, timeEntryId: runningEntry.id })
      .catch(reportFailure);
  }

  function handleStart() {
    if (startMutation.isPending) return;
    const description = draftDescription.trim();
    void startMutation
      .mutateAsync({ description, start: new Date().toISOString() })
      .then(() => {
        setDraftDescription((current) => (current.trim() === description ? "" : current));
      })
      .catch(reportFailure);
  }

  function handleContinue(entry: GithubComTogglTogglApiInternalModelsTimeEntry) {
    if (startMutation.isPending) return;
    void startMutation
      .mutateAsync({
        billable: entry.billable,
        description: (entry.description ?? "").trim(),
        projectColor: entry.project_color ?? null,
        projectId: resolveTimeEntryProjectId(entry),
        projectName: entry.project_name ?? null,
        start: new Date().toISOString(),
        tagIds: entry.tag_ids ?? [],
        tagNames: entry.tags ?? [],
      })
      .catch(reportFailure);
  }

  return (
    <div
      className="border-t border-[var(--track-border)] bg-[var(--track-panel)] px-4 py-2"
      data-testid="mobile-composer-bar"
    >
      {editingEntry ? (
        <MobileTimeEntryEditor entry={editingEntry} onClose={() => setEditingEntry(null)} />
      ) : null}
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
            <LiveDuration
              className="text-[12px] tabular-nums text-[var(--track-accent)]"
              entry={runningEntry}
            />
          </button>
          <TimerActionButton
            disabled={stopMutation.isPending}
            isRunning
            onClick={handleStop}
            size="sm"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                className="w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 pr-9 text-[14px] text-white placeholder-[var(--track-text-muted)] outline-none focus:border-[var(--track-accent)]"
                enterKeyHint="go"
                onChange={(event) => setDraftDescription(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleStart();
                }}
                placeholder={t("whatAreYouWorkingOn")}
                value={draftDescription}
              />
              {draftDescription ? (
                <button
                  aria-label={t("clearDraft")}
                  className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--track-text-muted)] transition active:bg-white/5"
                  onClick={() => setDraftDescription("")}
                  type="button"
                >
                  <span aria-hidden="true" className="text-[18px] leading-none">
                    ×
                  </span>
                </button>
              ) : null}
            </div>
            <TimerActionButton
              disabled={startMutation.isPending}
              isRunning={false}
              onClick={handleStart}
              size="sm"
            />
          </div>
          {!draftDescription ? (
            recentStoppedEntries.length > 0 ? (
              <div
                className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                  maskImage:
                    "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 24px), transparent 100%)",
                }}
              >
                {recentStoppedEntries.map((entry) => (
                  <button
                    aria-label={t("continueEntry", { description: entry.description })}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--track-border)] px-3 py-1.5 text-left transition active:scale-95 active:bg-white/5 disabled:opacity-70"
                    disabled={startMutation.isPending}
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
  );
}
