import type { ReportsBreakdownRow } from "./reports-page-data.ts";

/**
 * Generates a CSV string from breakdown rows and triggers a download.
 * Columns: Project/Group, Client, Duration, Amount.
 * Includes a total row at the bottom.
 */
export function exportReportCsv(breakdownRows: ReportsBreakdownRow[], totalDuration: string): void {
  const header = "Project,Client,Duration,Amount";
  const dataRows = breakdownRows.map((row) => {
    const name = escapeCsvField(row.name);
    const client = escapeCsvField(row.clientName ?? "");
    const duration = escapeCsvField(row.duration);
    return `${name},${client},${duration},`;
  });
  const totalRow = `Total,,${escapeCsvField(totalDuration)},`;
  const csv = [header, ...dataRows, totalRow].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
