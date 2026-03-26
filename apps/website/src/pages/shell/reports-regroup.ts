import type { SavedWeeklyReportData } from "../../shared/api/generated/public-reports/types.gen.ts";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";

import type { ReportsBreakdownMemberRow, ReportsBreakdownRow } from "./reports-page-data.ts";

/** Extract unique member names from raw report data rows */
export function extractUniqueMembers(report?: SavedWeeklyReportData): string[] {
  const names = new Set<string>();
  for (const row of report?.report ?? []) {
    const name = row.user_name?.trim();
    if (name) names.add(name);
  }
  return [...names].sort();
}

/** Extract unique client names from raw report data rows */
export function extractUniqueClients(report?: SavedWeeklyReportData): string[] {
  const names = new Set<string>();
  for (const row of report?.report ?? []) {
    const name = row.client_name?.trim();
    if (name) names.add(name);
  }
  return [...names].sort();
}

/** Filter report rows by member/client names before building the model */
export function filterReportRows(
  report: SavedWeeklyReportData | undefined,
  memberFilter: string[],
  clientFilter: string[],
): SavedWeeklyReportData | undefined {
  if (!report?.report) return report;
  if (memberFilter.length === 0 && clientFilter.length === 0) return report;

  const memberSet = new Set(memberFilter);
  const clientSet = new Set(clientFilter);
  const filtered = report.report.filter((row) => {
    if (memberFilter.length > 0) {
      const name = row.user_name?.trim() ?? "";
      if (!memberSet.has(name)) return false;
    }
    if (clientFilter.length > 0) {
      const name = row.client_name?.trim() ?? "";
      if (!clientSet.has(name)) return false;
    }
    return true;
  });

  return { ...report, report: filtered, totals: undefined };
}

/** Regroup breakdown rows by client dimension */
export function regroupByClient(breakdownRows: ReportsBreakdownRow[]): ReportsBreakdownRow[] {
  const byClient = new Map<string, { members: ReportsBreakdownMemberRow[]; seconds: number }>();
  for (const row of breakdownRows) {
    const client = row.clientName || "(No client)";
    const acc = byClient.get(client) ?? { members: [], seconds: 0 };
    acc.seconds += row.seconds;
    acc.members.push(...row.members);
    byClient.set(client, acc);
  }
  const totalSeconds = breakdownRows.reduce((s, r) => s + r.seconds, 0);
  return [...byClient.entries()]
    .sort(([, a], [, b]) => b.seconds - a.seconds)
    .map(([name, acc]) => {
      const shareValue = totalSeconds > 0 ? (acc.seconds / totalSeconds) * 100 : 0;
      return {
        clientName: name,
        color: "#9e9e9e",
        duration: formatClockDuration(acc.seconds),
        memberCount: acc.members.length,
        members: acc.members,
        name,
        seconds: acc.seconds,
        shareLabel: `${shareValue.toFixed(2)}%`,
        shareValue,
      };
    });
}

/** Regroup breakdown rows by individual entry (each member becomes a top-level row) */
export function regroupByEntry(breakdownRows: ReportsBreakdownRow[]): ReportsBreakdownRow[] {
  const totalSeconds = breakdownRows.reduce((s, r) => s + r.seconds, 0);
  const entries: ReportsBreakdownRow[] = [];
  for (const row of breakdownRows) {
    for (const member of row.members) {
      const shareValue = totalSeconds > 0 ? (member.seconds / totalSeconds) * 100 : 0;
      entries.push({
        clientName: row.clientName,
        color: row.color,
        duration: member.duration,
        memberCount: 1,
        members: [],
        name: `${row.name} / ${member.name}`,
        seconds: member.seconds,
        shareLabel: `${shareValue.toFixed(2)}%`,
        shareValue,
      });
    }
  }
  return entries.sort((a, b) => b.seconds - a.seconds);
}

/** Regroup breakdown rows by member dimension for slice chart */
export function regroupByMember(breakdownRows: ReportsBreakdownRow[]): ReportsBreakdownRow[] {
  const byMember = new Map<string, number>();
  for (const row of breakdownRows) {
    for (const member of row.members) {
      byMember.set(member.name, (byMember.get(member.name) ?? 0) + member.seconds);
    }
  }
  const totalSeconds = breakdownRows.reduce((s, r) => s + r.seconds, 0);
  return [...byMember.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([name, seconds]) => {
      const shareValue = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
      return {
        color: "#9e9e9e",
        duration: formatClockDuration(seconds),
        memberCount: 1,
        members: [],
        name,
        seconds,
        shareLabel: `${shareValue.toFixed(2)}%`,
        shareValue,
      };
    });
}
