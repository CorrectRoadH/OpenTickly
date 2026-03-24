import type {
  SavedWeeklyReportData,
  WeeklyDataRow,
} from "../../shared/api/generated/public-reports/types.gen.ts";
import { formatClockDuration, formatDateKey } from "../../features/tracking/overview-data.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";

export type ReportsPageMetric = {
  title: "Total Hours" | "Billable Hours" | "Amount" | "Average Daily Hours";
  value: string;
};

export type ReportsDayRow = {
  label: string;
  seconds: number;
  value: string;
};

export type ReportsBreakdownRow = {
  color: string;
  duration: string;
  memberCount: number;
  name: string;
  shareLabel: string;
  shareValue: number;
};

export type ReportsDistributionSegment = {
  color: string;
  value: number;
};

export type ReportsPageModel = {
  breakdownRows: ReportsBreakdownRow[];
  distributionSegments: ReportsDistributionSegment[];
  endDate: string;
  metrics: ReportsPageMetric[];
  rangeLabel: string;
  startDate: string;
  totalDuration: string;
  totalSeconds: number;
  weekRows: ReportsDayRow[];
};

type ProjectBreakdownAccumulator = {
  color: string;
  memberIds: Set<number>;
  name: string;
  totalSeconds: number;
};

export function buildReportsPageModel(args: {
  report?: SavedWeeklyReportData;
  now?: Date;
  timezone: string;
  weekStartsOn?: number;
}): ReportsPageModel {
  const weekDateKeys = getWeekDateKeys(args.timezone, args.weekStartsOn ?? 1, args.now);
  const startDate = weekDateKeys[0] ?? formatDateKey(args.now ?? new Date(), args.timezone);
  const endDate = weekDateKeys[weekDateKeys.length - 1] ?? startDate;
  const totalsByProject = new Map<string, ProjectBreakdownAccumulator>();
  const totalsByDay = new Map<string, number>();

  let billableSeconds = 0;

  (args.report?.report ?? []).forEach((row) => {
    applyWeeklyRowToModel(row, totalsByDay, totalsByProject, weekDateKeys);
    billableSeconds += sumValues(row.billable_seconds ?? []);
  });
  const totalSeconds =
    args.report?.totals?.seconds ??
    weekDateKeys.reduce((sum, key) => sum + (totalsByDay.get(key) ?? 0), 0);

  const trackedDays = weekDateKeys.reduce(
    (count, key) => count + ((totalsByDay.get(key) ?? 0) > 0 ? 1 : 0),
    0,
  );
  const averageDailyHours = trackedDays > 0 ? totalSeconds / 3600 / trackedDays : 0;

  const weekRows = weekDateKeys.map((dateKey) => ({
    label: formatWeekLabel(dateKey),
    seconds: totalsByDay.get(dateKey) ?? 0,
    value: formatReadableDuration(totalsByDay.get(dateKey) ?? 0),
  }));

  const breakdownRows = [...totalsByProject.values()]
    .sort((left, right) => right.totalSeconds - left.totalSeconds)
    .map((project) => {
      const shareValue = totalSeconds > 0 ? (project.totalSeconds / totalSeconds) * 100 : 0;

      return {
        color: project.color,
        duration: formatClockDuration(project.totalSeconds),
        memberCount: project.memberIds.size || 1,
        name: project.name,
        shareLabel: `${shareValue.toFixed(2)}%`,
        shareValue,
      };
    });

  return {
    breakdownRows,
    distributionSegments: breakdownRows.slice(0, 10).map((row) => ({
      color: row.color,
      value: row.shareValue,
    })),
    endDate,
    metrics: [
      { title: "Total Hours", value: formatClockDuration(totalSeconds) },
      { title: "Billable Hours", value: formatClockDuration(billableSeconds) },
      { title: "Amount", value: "-" },
      { title: "Average Daily Hours", value: `${averageDailyHours.toFixed(2)} Hours` },
    ],
    rangeLabel: `This week . W${getIsoWeekNumber(startDate)}`,
    startDate,
    totalDuration: formatClockDuration(totalSeconds),
    totalSeconds,
    weekRows,
  };
}

function formatReadableDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return "0:00";
  }

  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function applyWeeklyRowToModel(
  row: WeeklyDataRow,
  totalsByDay: Map<string, number>,
  totalsByProject: Map<string, ProjectBreakdownAccumulator>,
  weekDateKeys: string[],
) {
  const projectName = row.project_name?.trim() || "(No project)";
  const userId = row.user_id ?? 0;
  const currentProject = totalsByProject.get(projectName) ?? {
    color: resolveProjectColorValue({
      color: row.project_hex_color ?? row.project_color,
      name: projectName,
    }),
    memberIds: new Set<number>(),
    name: projectName,
    totalSeconds: 0,
  };

  currentProject.memberIds.add(userId);

  (row.seconds ?? []).forEach((seconds, index) => {
    const dateKey = weekDateKeys[index];
    if (!dateKey) {
      return;
    }
    currentProject.totalSeconds += seconds;
    totalsByDay.set(dateKey, (totalsByDay.get(dateKey) ?? 0) + seconds);
  });

  totalsByProject.set(projectName, currentProject);
}

function formatWeekLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(date);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);

  return `${weekday} ${monthDay}`;
}

function getWeekDateKeys(timezone: string, weekStartsOn: number, now = new Date()): string[] {
  const todayKey = formatDateKey(now, timezone);
  const todayDate = new Date(`${todayKey}T00:00:00Z`);
  const weekday = todayDate.getUTCDay();
  const offset = (weekday - normalizeWeekStart(weekStartsOn) + 7) % 7;
  const startDate = new Date(todayDate);
  startDate.setUTCDate(todayDate.getUTCDate() - offset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startDate);
    day.setUTCDate(startDate.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

function getIsoWeekNumber(dateKey: string): number {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));

  return Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function normalizeWeekStart(weekStartsOn: number): number {
  if (weekStartsOn >= 0 && weekStartsOn <= 6) {
    return weekStartsOn;
  }

  return 1;
}

function sumValues(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}
