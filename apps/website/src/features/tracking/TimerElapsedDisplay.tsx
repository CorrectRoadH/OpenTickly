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
      <span className="text-[29px] font-medium tabular-nums text-white" data-testid="timer-elapsed">
        0:00:00
      </span>
    );
  }

  return (
    <LiveDuration
      className="text-[29px] font-medium tabular-nums text-white"
      data-testid="timer-elapsed"
      entry={runningEntry}
    />
  );
}
