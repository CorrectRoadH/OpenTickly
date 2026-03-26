import type {
  SavedWeeklyReportData,
  WeeklyDataRow,
} from "../../shared/api/generated/public-reports/types.gen.ts";
import { formatClockDuration, formatDateKey } from "../../features/tracking/overview-data.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import {
  formatRangeDate,
  getDateRangeKeys,
  getIsoWeekNumber,
  getWeekDateKeys,
} from "./reports-date-utils.ts";

export type { ReportsDateRange, ReportsTimePeriod } from "./reports-date-utils.ts";
export { getDateRangeForPeriod, shiftWeekRange } from "./reports-date-utils.ts";

export type ReportsPageMetric = {
  title: "Total Hours" | "Billable Hours" | "Amount" | "Average Daily Hours";
  value: string;
};

export type ReportsDayRow = {
  label: string;
  seconds: number;
  value: string;
};

export type ReportsBreakdownMemberRow = {
  duration: string;
  name: string;
  seconds: number;
};

export type ReportsBreakdownRow = {
  clientName?: string;
  color: string;
  duration: string;
  memberCount: number;
  members: ReportsBreakdownMemberRow[];
  name: string;
  seconds: number;
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

type MemberAccumulator = {
  name: string;
  totalSeconds: number;
};

type ProjectBreakdownAccumulator = {
  clientName: string;
  color: string;
  memberIds: Set<number>;
  members: Map<number, MemberAccumulator>;
  name: string;
  totalSeconds: number;
};

export function buildReportsPageModel(args: {
  report?: SavedWeeklyReportData;
  now?: Date;
  startDate?: string;
  endDate?: string;
  timezone: string;
  weekStartsOn?: number;
}): ReportsPageModel {
  const dateKeys =
    args.startDate && args.endDate
      ? getDateRangeKeys(args.startDate, args.endDate)
      : getWeekDateKeys(args.timezone, args.weekStartsOn ?? 1, args.now);
  const startDate = dateKeys[0] ?? formatDateKey(args.now ?? new Date(), args.timezone);
  const endDate = dateKeys[dateKeys.length - 1] ?? startDate;
  const totalsByProject = new Map<string, ProjectBreakdownAccumulator>();
  const totalsByDay = new Map<string, number>();

  let billableSeconds = 0;

  (args.report?.report ?? []).forEach((row) => {
    applyWeeklyRowToModel(row, totalsByDay, totalsByProject, dateKeys);
    billableSeconds += sumValues(row.billable_seconds ?? []);
  });
  const totalSeconds =
    args.report?.totals?.seconds ??
    dateKeys.reduce((sum, key) => sum + (totalsByDay.get(key) ?? 0), 0);

  const trackedDays = dateKeys.reduce(
    (count, key) => count + ((totalsByDay.get(key) ?? 0) > 0 ? 1 : 0),
    0,
  );
  const averageDailyHours = trackedDays > 0 ? totalSeconds / 3600 / trackedDays : 0;

  const weekRows = dateKeys.map((dateKey) => ({
    label: formatWeekLabel(dateKey),
    seconds: totalsByDay.get(dateKey) ?? 0,
    value: formatReadableDuration(totalsByDay.get(dateKey) ?? 0),
  }));

  const breakdownRows = [...totalsByProject.values()]
    .sort((left, right) => right.totalSeconds - left.totalSeconds)
    .map((project) => {
      const shareValue = totalSeconds > 0 ? (project.totalSeconds / totalSeconds) * 100 : 0;
      const members = [...project.members.values()]
        .sort((a, b) => b.totalSeconds - a.totalSeconds)
        .map((m) => ({
          duration: formatClockDuration(m.totalSeconds),
          name: m.name,
          seconds: m.totalSeconds,
        }));

      return {
        clientName: project.clientName,
        color: project.color,
        duration: formatClockDuration(project.totalSeconds),
        memberCount: project.memberIds.size || 1,
        members,
        name: project.name,
        seconds: project.totalSeconds,
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
    rangeLabel: buildRangeLabel(
      startDate,
      endDate,
      args.timezone,
      args.weekStartsOn ?? 1,
      args.now,
    ),
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
  dateKeys: string[],
) {
  const projectName = row.project_name?.trim() || "(No project)";
  const userId = row.user_id ?? 0;
  const currentProject = totalsByProject.get(projectName) ?? {
    clientName: row.client_name?.trim() || "",
    color: resolveProjectColorValue({
      color: row.project_hex_color ?? row.project_color,
      name: projectName,
    }),
    memberIds: new Set<number>(),
    members: new Map<number, MemberAccumulator>(),
    name: projectName,
    totalSeconds: 0,
  };

  currentProject.memberIds.add(userId);
  const memberName = row.user_name?.trim() || `User ${userId}`;
  const memberAcc = currentProject.members.get(userId) ?? { name: memberName, totalSeconds: 0 };

  (row.seconds ?? []).forEach((seconds, index) => {
    const dateKey = dateKeys[index];
    if (!dateKey) {
      return;
    }
    currentProject.totalSeconds += seconds;
    memberAcc.totalSeconds += seconds;
    totalsByDay.set(dateKey, (totalsByDay.get(dateKey) ?? 0) + seconds);
  });

  currentProject.members.set(userId, memberAcc);
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

function sumValues(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

export {
  extractUniqueClients,
  extractUniqueMembers,
  filterReportRows,
  regroupByClient,
  regroupByEntry,
  regroupByMember,
} from "./reports-regroup.ts";

function buildRangeLabel(
  startDate: string,
  endDate: string,
  timezone: string,
  weekStartsOn: number,
  now?: Date,
): string {
  const currentWeekKeys = getWeekDateKeys(timezone, weekStartsOn, now);
  const currentWeekStart = currentWeekKeys[0] ?? "";
  const currentWeekEnd = currentWeekKeys[currentWeekKeys.length - 1] ?? "";

  if (startDate === currentWeekStart && endDate === currentWeekEnd) {
    return `This week . W${getIsoWeekNumber(startDate)}`;
  }

  const weekNumber = getIsoWeekNumber(startDate);
  const startD = new Date(`${startDate}T00:00:00Z`);
  const endD = new Date(`${endDate}T00:00:00Z`);
  const dayCount = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;

  if (dayCount === 7) {
    return `W${weekNumber} . ${formatRangeDate(startDate)} - ${formatRangeDate(endDate)}`;
  }

  return `${formatRangeDate(startDate)} - ${formatRangeDate(endDate)}`;
}
