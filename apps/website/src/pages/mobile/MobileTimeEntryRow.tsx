import type { ReactElement } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  formatClockDuration,
  resolveEntryColor,
  resolveEntryDurationSeconds,
} from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { PlayIcon } from "../../shared/ui/icons.tsx";

type MobileTimeEntryRowProps = {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  nowMs: number;
  onContinue: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onEdit?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
};

export function MobileTimeEntryRow({
  entry,
  nowMs,
  onContinue,
  onEdit,
}: MobileTimeEntryRowProps): ReactElement {
  const { durationFormat } = useUserPreferences();
  const color = resolveEntryColor(entry);
  const seconds = resolveEntryDurationSeconds(entry, nowMs);
  const duration = formatClockDuration(seconds, durationFormat);
  const description = entry.description?.trim() || "No description";
  const projectName = entry.project_name?.trim();
  const tagNames = entry.tags ?? [];
  const hasTags = tagNames.length > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        aria-label={`Continue ${description}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--track-border)] text-[var(--track-text-muted)] transition hover:border-[var(--track-accent)] hover:text-[var(--track-accent)]"
        onClick={() => onContinue(entry)}
        type="button"
      >
        <PlayIcon className="size-3.5" />
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={() => onEdit?.(entry)} type="button">
        <p className="truncate text-[13px] text-white">{description}</p>
        {projectName || hasTags ? (
          <p className="flex items-center gap-1 truncate text-[11px] text-[var(--track-text-muted)]">
            {projectName ? (
              <>
                <span
                  className="inline-block size-[6px] shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate">{projectName}</span>
              </>
            ) : null}
            {hasTags ? (
              <>
                {projectName ? <span>·</span> : null}
                <span className="truncate">{tagNames.join(", ")}</span>
              </>
            ) : null}
          </p>
        ) : null}
      </button>
      <span className="shrink-0 text-[12px] tabular-nums text-[var(--track-text-muted)]">
        {duration}
      </span>
    </div>
  );
}
