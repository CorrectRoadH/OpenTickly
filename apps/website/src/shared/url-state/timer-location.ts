const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type TimerSearch = {
  date?: unknown;
  /** OpenToggl start-link params */
  description?: unknown;
  project_id?: unknown;
  tag_ids?: unknown;
  billable?: unknown;
  /** Toggl-compatible aliases */
  desc?: unknown;
  wid?: unknown;
};

export type ParsedTimerSearch = {
  date?: string;
  /** Start-link params: when present, auto-start a timer */
  start?: {
    description?: string;
    projectId?: number;
    tagIds?: number[];
    billable?: boolean;
  };
};

/**
 * Parses the ?date=YYYY-MM-DD search param and optional start-link params
 * for the /timer route. Supports both OpenToggl params (description, project_id,
 * tag_ids, billable) and Toggl-compatible aliases (desc, wid).
 */
export function parseTimerSearch(search: TimerSearch | undefined): ParsedTimerSearch {
  const result: ParsedTimerSearch = {};

  // Parse date
  const rawDate = search?.date;
  if (typeof rawDate === "string" && DATE_PATTERN.test(rawDate)) {
    const parsed = new Date(rawDate + "T00:00:00");
    if (!Number.isNaN(parsed.getTime())) {
      result.date = rawDate;
    }
  }

  // Parse start-link params (any present param triggers start)
  const rawDesc =
    typeof search?.description === "string"
      ? search.description
      : typeof search?.desc === "string"
        ? search.desc
        : undefined;
  const rawProjectId = parsePositiveInt(search?.project_id);
  const rawTagIds = parseIntList(search?.tag_ids);
  const rawBillable = search?.billable === "true" || search?.billable === true;

  const hasStartParams =
    rawDesc != null || rawProjectId != null || rawTagIds != null || rawBillable;

  if (hasStartParams) {
    result.start = {};
    if (rawDesc != null) result.start.description = rawDesc;
    if (rawProjectId != null) result.start.projectId = rawProjectId;
    if (rawTagIds != null) result.start.tagIds = rawTagIds;
    if (rawBillable) result.start.billable = true;
  }

  return result;
}

/**
 * Converts a validated YYYY-MM-DD string into a local-midnight Date,
 * or returns undefined if the string is absent/invalid.
 */
export function resolveTimerSearchDate(date: string | undefined): Date | undefined {
  if (date == null) {
    return undefined;
  }
  const parsed = new Date(date + "T00:00:00");
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parsePositiveInt(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && Number.isInteger(n) ? n : undefined;
}

function parseIntList(value: unknown): number[] | undefined {
  if (value == null) return undefined;
  const raw =
    typeof value === "string" || typeof value === "number" || typeof value === "bigint"
      ? String(value)
      : undefined;
  if (!raw?.trim()) return undefined;
  const nums = raw
    .split(",")
    .map(Number)
    .filter((n) => Number.isFinite(n) && Number.isInteger(n) && n > 0);
  return nums.length > 0 ? nums : undefined;
}
