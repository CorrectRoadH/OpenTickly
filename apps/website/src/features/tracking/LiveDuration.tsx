import { type ReactElement, useEffect, useState } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { formatClockDuration, resolveEntryDurationSeconds } from "./overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";

/**
 * Self-updating duration display for a running time entry.
 * Ticks every second internally — the parent never re-renders.
 *
 * For stopped entries, use `formatClockDuration(resolveEntryDurationSeconds(entry))` directly.
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
  const { durationFormat } = useUserPreferences();
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
      {formatClockDuration(seconds, durationFormat)}
    </span>
  );
}
