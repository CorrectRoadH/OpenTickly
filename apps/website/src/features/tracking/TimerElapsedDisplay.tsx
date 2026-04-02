import type { ReactElement } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { useNowMs } from "../../shared/hooks/useNowMs.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { formatClockDuration, resolveEntryDurationSeconds } from "./overview-data.ts";

export function TimerElapsedDisplay({
  runningEntry,
}: {
  runningEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;
}): ReactElement {
  const nowMs = useNowMs();
  const { durationFormat } = useUserPreferences();
  const seconds = runningEntry ? resolveEntryDurationSeconds(runningEntry, nowMs) : 0;

  return (
    <span className="text-[29px] font-medium tabular-nums text-white" data-testid="timer-elapsed">
      {seconds > 0 ? formatClockDuration(seconds, durationFormat) : "0:00:00"}
    </span>
  );
}
