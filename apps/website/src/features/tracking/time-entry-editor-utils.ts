import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";
import type { TimeEntryEditorAnchor, TimeEntryEditorTag } from "./time-entry-editor-types.ts";

export function toTimeInputValue(date: Date, timezone: string): string {
  const parts = getTimeZoneParts(date, timezone);
  const hours = String(parts.hours).padStart(2, "0");
  const minutes = String(parts.minutes).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function applyTimeInputValue(date: Date, value: string, timezone: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const currentParts = getTimeZoneParts(date, timezone);
  return buildDateInTimeZone(
    {
      day: currentParts.day,
      hours,
      minutes,
      month: currentParts.month,
      year: currentParts.year,
    },
    timezone,
  );
}

export function getTimeZoneParts(
  date: Date,
  timezone: string,
): {
  day: number;
  hours: number;
  minutes: number;
  month: number;
  year: number;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
  const parts = formatter.formatToParts(date);

  return {
    day: Number(parts.find((part) => part.type === "day")?.value ?? "1"),
    hours: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minutes: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
    year: Number(parts.find((part) => part.type === "year")?.value ?? "1970"),
  };
}

function buildDateInTimeZone(
  parts: {
    day: number;
    hours: number;
    minutes: number;
    month: number;
    year: number;
  },
  timezone: string,
): Date {
  let candidate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes, 0, 0),
  );

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const resolved = getTimeZoneParts(candidate, timezone);
    const diffMinutes = resolvePartsDifferenceInMinutes(parts, resolved);
    if (diffMinutes === 0) {
      break;
    }
    candidate = new Date(candidate.getTime() + diffMinutes * 60_000);
  }

  return candidate;
}

function resolvePartsDifferenceInMinutes(
  target: {
    day: number;
    hours: number;
    minutes: number;
    month: number;
    year: number;
  },
  actual: {
    day: number;
    hours: number;
    minutes: number;
    month: number;
    year: number;
  },
): number {
  const targetUtc = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hours,
    target.minutes,
    0,
    0,
  );
  const actualUtc = Date.UTC(
    actual.year,
    actual.month - 1,
    actual.day,
    actual.hours,
    actual.minutes,
    0,
    0,
  );

  return Math.round((targetUtc - actualUtc) / 60_000);
}

export type DescriptionMode = "billable" | "default" | "project" | "tag";

export function resolveDescriptionMode(value: string): DescriptionMode {
  if (value.startsWith("@")) {
    return "project";
  }

  if (value.startsWith("#")) {
    return "tag";
  }

  if (value.startsWith("$")) {
    return "billable";
  }

  return "default";
}

export function buildSuggestionEntries(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
): GithubComTogglTogglApiInternalModelsTimeEntry[] {
  const seen = new Set<string>();
  const suggestions: GithubComTogglTogglApiInternalModelsTimeEntry[] = [];

  for (const entry of entries) {
    const key = buildSuggestionKey(entry);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    suggestions.push(entry);
    if (suggestions.length >= 6) {
      break;
    }
  }

  return suggestions;
}

export function buildSuggestionKey(entry: GithubComTogglTogglApiInternalModelsTimeEntry): string {
  return [
    entry.description?.trim() ?? "",
    resolveTimeEntryProjectId(entry) ?? "",
    (entry.tag_ids ?? []).join(","),
  ].join("::");
}

export async function copyToClipboard(value: string): Promise<void> {
  if (!value || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return;
  }

  await navigator.clipboard.writeText(value);
}

export function resolveEditorPosition(
  anchor: TimeEntryEditorAnchor,
  picker: "project" | "tag" | null,
): {
  left: number;
  top: number;
} {
  const cardWidth = picker ? 460 : 440;
  const cardHeight = picker ? 470 : 212;
  const padding = 16;
  const preferredLeft = anchor.left + anchor.width + 12;
  const fallbackLeft = anchor.left - cardWidth - 12;
  const containerWidth = anchor.containerWidth ?? preferredLeft + cardWidth + padding;
  const containerHeight = anchor.containerHeight ?? anchor.top + cardHeight + padding;
  const canPlaceRight = preferredLeft + cardWidth <= containerWidth - padding;
  const canPlaceLeft = fallbackLeft >= padding;
  const unclamped = (() => {
    if (anchor.preferredPlacement === "left" && canPlaceLeft) {
      return fallbackLeft;
    }
    if (anchor.preferredPlacement === "right" && canPlaceRight) {
      return preferredLeft;
    }
    if (canPlaceRight) {
      return preferredLeft;
    }
    if (canPlaceLeft) {
      return fallbackLeft;
    }
    return Math.max(padding, Math.min(containerWidth - cardWidth - padding, fallbackLeft));
  })();
  const left = Math.max(padding, Math.min(unclamped, containerWidth - cardWidth - padding));
  const top = Math.max(padding, Math.min(containerHeight - cardHeight - padding, anchor.top - 6));

  return { left, top };
}

export function resolveTagTriggerLabel(tags: TimeEntryEditorTag[]): string | undefined {
  if (tags.length === 0) {
    return undefined;
  }

  return tags.map((t) => t.name).join(", ");
}

export function colorToChipBackground(color: string): string {
  if (!color.startsWith("#")) {
    return `color-mix(in srgb, ${color} 24%, transparent)`;
  }

  const normalized = color.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, 0.24)`;
}
