import { type ReactElement, useEffect, useState } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { formatClockDuration, resolveEntryDurationSeconds } from "./overview-data.ts";

/**
 * Self-updating duration display for a running time entry.
 * Ticks every second internally — the parent never re-renders.
 *
 * Always renders as `H:MM:SS` regardless of the user's `durationFormat` preference.
 * Toggl does the same: the live running clock shows seconds ticking (`H:MM:SS`),
 * while Classic/Decimal formats only apply to stopped entries.
 *
 * For stopped entries, use `formatClockDuration(resolveEntryDurationSeconds(entry), durationFormat)`.
 */
export function LiveDuration({
  entry,
  className,
  "data-testid": dataTestId,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  className?: string;
  "data-testid"?: string;
}): ReactElement {
  const [seconds, setSeconds] = useState(() => resolveEntryDurationSeconds(entry, Date.now()));

  useEffect(() => {
    setSeconds(resolveEntryDurationSeconds(entry, Date.now()));
    const id = setInterval(() => {
      setSeconds(resolveEntryDurationSeconds(entry, Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [entry]);

  return (
    <span className={className} data-testid={dataTestId}>
      {formatClockDuration(seconds)}
    </span>
  );
}
