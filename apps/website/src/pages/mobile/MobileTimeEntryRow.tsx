import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@opentickly/web-ui";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { LiveDuration } from "../../features/tracking/LiveDuration.tsx";
import {
  formatClockDuration,
  resolveEntryColor,
  resolveEntryDurationSeconds,
} from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { PlayIcon } from "../../shared/ui/icons.tsx";

function isRunning(entry: GithubComTogglTogglApiInternalModelsTimeEntry): boolean {
  return !entry.stop && typeof entry.duration === "number" && entry.duration < 0;
}

type MobileTimeEntryRowProps = {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onContinue: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onEdit?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
};

export function MobileTimeEntryRow({
  entry,
  onContinue,
  onEdit,
}: MobileTimeEntryRowProps): ReactElement {
  const { t } = useTranslation("mobile");
  const { durationFormat } = useUserPreferences();
  const color = resolveEntryColor(entry);
  const description = entry.description?.trim() || t("noDescription");
  const projectName = entry.project_name?.trim();
  const tagNames = entry.tags ?? [];
  const hasTags = tagNames.length > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 transition active:bg-white/[0.03]">
      <IconButton
        aria-label={t("continueTimeEntry", { description })}
        onClick={() => onContinue(entry)}
        size="lg"
      >
        <PlayIcon className="size-3.5" />
      </IconButton>
      <button
        aria-label={t("editTimeEntry", { description })}
        className="min-w-0 flex-1 text-left"
        onClick={() => onEdit?.(entry)}
        type="button"
      >
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
      {isRunning(entry) ? (
        <LiveDuration
          className="shrink-0 text-[12px] tabular-nums text-[var(--track-text-muted)]"
          entry={entry}
        />
      ) : (
        <span className="shrink-0 text-[12px] tabular-nums text-[var(--track-text-muted)]">
          {formatClockDuration(resolveEntryDurationSeconds(entry), durationFormat)}
        </span>
      )}
    </div>
  );
}
