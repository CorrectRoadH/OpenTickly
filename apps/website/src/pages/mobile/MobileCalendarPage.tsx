import { type ReactElement, useMemo, useState } from "react";

import { formatDateKey } from "../../features/tracking/overview-data.ts";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { useTimerPageOrchestration } from "../shell/useTimerPageOrchestration.ts";
import { MobileCalendarDayTimeline } from "./MobileCalendarDayTimeline.tsx";
import { MobileDayStrip } from "./MobileDayStrip.tsx";
import { MobileTimeEntryEditor } from "./MobileTimeEntryEditor.tsx";

export function MobileCalendarPage(): ReactElement {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [editingEntry, setEditingEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);
  const orch = useTimerPageOrchestration({ showAllEntries: false });

  const dayEntries = useMemo(() => {
    const selectedKey = formatDateKey(selectedDate, orch.timezone);
    return orch.visibleEntries.filter((entry) => {
      const entryDate = new Date(entry.start ?? entry.at ?? Date.now());
      return formatDateKey(entryDate, orch.timezone) === selectedKey;
    });
  }, [selectedDate, orch.visibleEntries, orch.timezone]);

  return (
    <div className="flex h-full flex-col">
      <MobileDayStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        weekStartsOn={orch.beginningOfWeek}
      />
      <MobileCalendarDayTimeline
        entries={dayEntries}
        nowMs={orch.nowMs}
        onEntryTap={setEditingEntry}
        timezone={orch.timezone}
      />
      {editingEntry ? (
        <MobileTimeEntryEditor entry={editingEntry} onClose={() => setEditingEntry(null)} />
      ) : null}
    </div>
  );
}
