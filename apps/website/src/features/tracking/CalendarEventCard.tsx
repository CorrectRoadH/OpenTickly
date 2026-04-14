import { useEffect, useRef } from "react";
import { transparentize } from "polished";
import { useTranslation } from "react-i18next";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { formatClockDuration, resolveEntryDurationSeconds } from "./overview-data.ts";
import { useRenderCount } from "@uidotdev/usehooks";

import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { PlayIcon, TagsIcon } from "../../shared/ui/icons.tsx";
import type { CalendarEvent } from "./calendar-types.ts";
import { colorToOverlay, vividColor } from "./calendar-types.ts";

export function CalendarEventCard({
  event,
  onContextMenu,
  onContinueEntry,
  onEditEntry,
}: {
  event: CalendarEvent;
  onContextMenu?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    x: number,
    y: number,
  ) => void;
  onContinueEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
}) {
  const { t } = useTranslation("tracking");
  const { durationFormat } = useUserPreferences();
  const entry = event.entry;
  const durationSeconds = resolveEntryDurationSeconds(entry);
  const color = event.resource.color;
  const isRunning = event.resource.isRunning;
  const cardRef = useRef<HTMLDivElement>(null);
  const entryId = event.id;
  const isDraft = event.resource.isDraft;
  const allowDirectEdit = !event.resource.isLocked && !isRunning && !isDraft;
  const renderCount = useRenderCount();

  // Draft entries auto-open the editor anchored to their real DOM position
  useEffect(() => {
    if (!isDraft || !cardRef.current) return;
    onEditEntry?.(entry, cardRef.current.getBoundingClientRect());
  }, [isDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={cardRef}
      className={`group h-full ${allowDirectEdit ? "cursor-grab" : "cursor-default"}`}
      data-testid={`calendar-entry-${entryId ?? "unknown"}`}
      onClick={(e) => onEditEntry?.(entry, e.currentTarget.getBoundingClientRect())}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(entry, e.clientX, e.clientY);
      }}
    >
      {/* Inner EventBox -- Toggl uses padding 4px 6px for entries >=15min,
          0px for shorter ones. border-radius 4px always. */}
      <div
        className={`relative flex h-full flex-col justify-between overflow-hidden rounded-[4px] text-left text-[12px] text-[var(--track-text)] ${
          durationSeconds >= 900 ? "px-1.5 py-1" : "px-0 py-0"
        }`}
        style={{
          backgroundColor: isRunning ? colorToOverlay(color, 0.08) : colorToOverlay(color, 0.5),
          backgroundImage: isRunning
            ? `repeating-linear-gradient(-45deg, transparent 0 0.5em, ${transparentize(0.92, color)} 0.5em 0.6em)`
            : undefined,
        }}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className={`truncate font-semibold leading-tight ${entry.description?.trim() ? "" : "text-[var(--track-text-muted)]"}`}
          >
            {entry.description?.trim() || t("addDescription")}
          </span>
          {import.meta.env.DEV ? (
            <span
              className="truncate font-mono text-[11px] leading-tight text-[var(--track-text-muted)]"
              data-testid={`calendar-entry-rendercount-${entryId ?? "unknown"}`}
            >
              renders: {renderCount}
            </span>
          ) : null}
          {entry.project_name ? (
            <span
              className="truncate text-[12px] font-medium leading-tight"
              style={{ color: vividColor(color) }}
            >
              {entry.project_name}
            </span>
          ) : null}
          {entry.tags && entry.tags.length > 0 ? (
            <span className="flex items-center gap-1 truncate text-[11px] leading-tight text-[var(--track-text-muted)]">
              <TagsIcon className="size-2.5 shrink-0" />
              <span className="truncate">{entry.tags.join(", ")}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-[12px] font-semibold tabular-nums leading-tight">
            {formatClockDuration(durationSeconds, durationFormat)}
          </span>
        </div>
        <button
          aria-label={t("continueTimeEntryAria")}
          className="absolute bottom-1 right-1 z-20 flex size-5 items-center justify-center rounded-full bg-[var(--track-accent-secondary)] text-[var(--track-surface)] opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onContinueEntry?.(entry);
          }}
          type="button"
        >
          <PlayIcon className="size-2.5" />
        </button>
      </div>
    </div>
  );
}
