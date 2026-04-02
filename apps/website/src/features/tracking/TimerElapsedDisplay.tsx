import type { ReactElement } from "react";

import { useRunningTimerContext } from "./contexts/RunningTimerContext.tsx";
import { formatClockDuration } from "./overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";

export function TimerElapsedDisplay(): ReactElement {
  const { runningDurationSeconds } = useRunningTimerContext();
  const { durationFormat } = useUserPreferences();

  return (
    <span className="text-[29px] font-medium tabular-nums text-white" data-testid="timer-elapsed">
      {runningDurationSeconds > 0
        ? formatClockDuration(runningDurationSeconds, durationFormat)
        : "0:00:00"}
    </span>
  );
}
