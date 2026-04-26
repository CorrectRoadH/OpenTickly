import type { ReactElement } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { LiveDuration } from "./LiveDuration.tsx";

export function TimerElapsedDisplay({
  runningEntry,
}: {
  runningEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;
}): ReactElement {
  if (!runningEntry) {
    return (
      <span className={ELAPSED_CLASS} data-testid="timer-elapsed">
        0:00:00
      </span>
    );
  }

  return (
    <LiveDuration className={ELAPSED_CLASS} data-testid="timer-elapsed" entry={runningEntry} />
  );
}

// Fixed 8ch slot (covers H:MM:SS up to 99:59:59) + right-aligned digits so
// the timer climbing 0:00:01 → 1:00:00 doesn't push the start/stop button
// or the left-side composer content sideways. tabular-nums keeps each
// digit equal width within the slot.
const ELAPSED_CLASS =
  "inline-block w-[8ch] text-right text-[29px] font-medium tabular-nums text-white";
