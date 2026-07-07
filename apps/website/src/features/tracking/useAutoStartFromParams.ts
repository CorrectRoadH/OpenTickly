import { useEffect, useRef } from "react";

import type { useTimerComposer } from "./useTimerComposer.ts";

export type StartParams = {
  description?: string;
  projectId?: number;
  tagIds?: number[];
  billable?: boolean;
};

/**
 * Auto-starts a timer from URL params once the current-entry query has
 * settled, then strips the consumed params from the address bar.
 */
export function useAutoStartFromParams(
  composer: ReturnType<typeof useTimerComposer>,
  startParams: StartParams | undefined,
): void {
  // Auto-start timer from URL params
  const startParamsConsumedRef = useRef(false);
  const currentEntryLoaded =
    !composer.currentTimeEntryQuery.isPending && !composer.currentTimeEntryQuery.isFetching;
  useEffect(() => {
    if (!startParams || startParamsConsumedRef.current || !currentEntryLoaded) return;
    startParamsConsumedRef.current = true;

    void composer.handleStartFromUrl(startParams).then(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("description");
      url.searchParams.delete("desc");
      url.searchParams.delete("project_id");
      url.searchParams.delete("tag_ids");
      url.searchParams.delete("billable");
      url.searchParams.delete("wid");
      window.history.replaceState(window.history.state, "", url.toString());
    });
  }, [startParams, currentEntryLoaded, composer]);
}
