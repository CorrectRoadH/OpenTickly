import { type ReactElement, useState } from "react";

import { formatDateKey } from "../../features/tracking/overview-data.ts";
import { useWeekNavigation } from "../../features/tracking/useWeekNavigation.ts";
import { useWorkspaceData } from "../../features/tracking/useWorkspaceData.ts";
import { useTimeEntryViews } from "../../features/tracking/useTimeEntryViews.ts";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { MobileCalendarDayTimeline } from "./MobileCalendarDayTimeline.tsx";
import { MobileDayStrip } from "./MobileDayStrip.tsx";
import { MobileTimeEntryEditor } from "./MobileTimeEntryEditor.tsx";

export function MobileCalendarPage(): ReactElement {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [editingEntry, setEditingEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);
  const { workspaceId, timezone } = useWorkspaceData();
  const { beginningOfWeek } = useWeekNavigation();
  const views = useTimeEntryViews({ workspaceId, timezone, showAllEntries: false });

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

  return (
    <div className="flex h-full flex-col">
      <MobileDayStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        weekStartsOn={beginningOfWeek}
      />
      <MobileCalendarDayTimeline
        entries={dayEntries}
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
