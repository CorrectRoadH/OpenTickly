import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatDateKey } from "../../features/tracking/overview-data.ts";
import { useWeekNavigation } from "../../features/tracking/useWeekNavigation.ts";
import { useWorkspaceData } from "../../features/tracking/useWorkspaceData.ts";
import { useTimeEntryViews } from "../../features/tracking/useTimeEntryViews.ts";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { useCreateTimeEntryMutation } from "../../shared/query/web-shell.ts";
import { MobileCalendarDayTimeline } from "./MobileCalendarDayTimeline.tsx";
import { MobileDayStrip } from "./MobileDayStrip.tsx";
import { MobileTimeEntryEditor } from "./MobileTimeEntryEditor.tsx";

export function MobileCalendarPage(): ReactElement {
  const { t } = useTranslation("mobile");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [editingEntry, setEditingEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);
  const { workspaceId, timezone } = useWorkspaceData();
  const { beginningOfWeek } = useWeekNavigation();
  const views = useTimeEntryViews({ workspaceId, timezone, showAllEntries: false });
  const createMutation = useCreateTimeEntryMutation(workspaceId);

  const dayEntries = (() => {
    const selectedKey = formatDateKey(selectedDate, timezone);
    return views.visibleEntries.filter((entry) => {
      const startDate = new Date(entry.start ?? entry.at ?? Date.now());
      if (formatDateKey(startDate, timezone) === selectedKey) return true;
      if (entry.stop) {
        const stopDate = new Date(entry.stop);
        if (formatDateKey(stopDate, timezone) === selectedKey) return true;
      }
      return false;
    });
  })();

  // Tapping an empty slot in the timeline creates a 30-minute draft at
  // that time and opens the editor on it — most calendar apps
  // (Google Calendar, Toggl desktop, Fantastical) behave this way, and
  // before this the calendar on mobile was read-only, with users forced
  // to go back to the timer page just to log retroactive time.
  //
  // The mutation's onMutate paints the block on the timeline at tap
  // time, so the user sees feedback instantly; the editor itself only
  // opens once the server returns a real id, because downstream save /
  // delete mutations key on that id. Typical round-trip is <300ms; on a
  // slow connection the user still sees the tentative block immediately.
  async function handleEmptySlotTap(minutesFromMidnight: number) {
    // Build a Date for the selected day at the tapped minute, in the user's timezone.
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    const d = selectedDate.getDate();
    const hour = Math.floor(minutesFromMidnight / 60);
    const minute = minutesFromMidnight % 60;
    const localStart = new Date(y, m, d, hour, minute, 0, 0);
    const localStop = new Date(localStart.getTime() + 30 * 60 * 1000);
    try {
      const created = await createMutation.mutateAsync({
        duration: 30 * 60,
        start: localStart.toISOString(),
        stop: localStop.toISOString(),
      });
      if (created) {
        setEditingEntry(created as GithubComTogglTogglApiInternalModelsTimeEntry);
      }
    } catch {
      // onError in the mutation rolls back the optimistic insert; nothing to do here.
    }
  }

  return (
    <div className="flex h-full flex-col">
      <MobileDayStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        weekStartsOn={beginningOfWeek}
      />
      {views.timeEntriesQuery.isSuccess && dayEntries.length === 0 ? (
        <p
          className="px-4 pt-2 text-center text-[11px] text-[var(--track-text-muted)]"
          data-testid="mobile-calendar-empty-hint"
        >
          {t("tapSlotToCreate")}
        </p>
      ) : null}
      <MobileCalendarDayTimeline
        entries={dayEntries}
        onEmptySlotTap={handleEmptySlotTap}
        onEntryTap={setEditingEntry}
        timezone={timezone}
        viewDate={selectedDate}
      />
      {editingEntry ? (
        <MobileTimeEntryEditor entry={editingEntry} onClose={() => setEditingEntry(null)} />
      ) : null}
    </div>
  );
}
