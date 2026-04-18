import type { ReactElement } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { LiveDuration } from "./LiveDuration.tsx";
import { formatClockTime } from "./overview-data.ts";

export function TimerElapsedDisplay({
  runningEntry,
  timezone,
}: {
  runningEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  timezone: string;
}): ReactElement {
  if (!runningEntry) {
    return (
      <span className="text-[29px] font-medium tabular-nums text-white" data-testid="timer-elapsed">
        0:00:00
      </span>
    );
  }

  const start = runningEntry.start ? new Date(runningEntry.start) : null;
  const startLabel = start ? formatClockTime(start, timezone) : null;

  return (
    <div className="flex flex-col items-end">
      <LiveDuration
        className="text-[29px] font-medium tabular-nums text-white"
        data-testid="timer-elapsed"
        entry={runningEntry}
      />
      {startLabel ? (
        <span
          className="text-[11px] font-medium tabular-nums text-[var(--track-text-muted)]"
          data-testid="timer-running-started-at"
        >
          {startLabel}
        </span>
      ) : null}
    </div>
  );
}
