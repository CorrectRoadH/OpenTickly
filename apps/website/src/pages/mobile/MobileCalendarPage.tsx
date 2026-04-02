import { type ReactElement, useMemo, useState } from "react";

import { formatDateKey } from "../../features/tracking/overview-data.ts";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { TimerPageProviders } from "../../features/tracking/contexts/TimerPageProviders.tsx";
import { useWorkspaceContext } from "../../features/tracking/contexts/WorkspaceContext.tsx";
import { useTimeEntriesContext } from "../../features/tracking/contexts/TimeEntriesContext.tsx";
import { useRunningTimerContext } from "../../features/tracking/contexts/RunningTimerContext.tsx";
import { MobileCalendarDayTimeline } from "./MobileCalendarDayTimeline.tsx";
import { MobileDayStrip } from "./MobileDayStrip.tsx";
import { MobileTimeEntryEditor } from "./MobileTimeEntryEditor.tsx";

export function MobileCalendarPage(): ReactElement {
  return (
    <TimerPageProviders>
      <MobileCalendarPageContent />
    </TimerPageProviders>
  );
}

function MobileCalendarPageContent(): ReactElement {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [editingEntry, setEditingEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);
  const { timezone, beginningOfWeek } = useWorkspaceContext();
  const { visibleEntries } = useTimeEntriesContext();
  const { nowMs } = useRunningTimerContext();

  const dayEntries = useMemo(() => {
    const selectedKey = formatDateKey(selectedDate, timezone);
    return visibleEntries.filter((entry) => {
      const startDate = new Date(entry.start ?? entry.at ?? Date.now());
      if (formatDateKey(startDate, timezone) === selectedKey) return true;
      if (entry.stop) {
        const stopDate = new Date(entry.stop);
        if (formatDateKey(stopDate, timezone) === selectedKey) return true;
      }
      return false;
    });
  }, [selectedDate, visibleEntries, timezone]);

  return (
    <div className="flex h-full flex-col">
      <MobileDayStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        weekStartsOn={beginningOfWeek}
      />
      <MobileCalendarDayTimeline
        entries={dayEntries}
        nowMs={nowMs}
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
