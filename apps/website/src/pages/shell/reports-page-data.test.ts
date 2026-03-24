import { describe, expect, it } from "vitest";

import type { SavedWeeklyReportData } from "../../shared/api/generated/public-reports/types.gen.ts";
import { buildReportsPageModel } from "./reports-page-data.ts";

describe("buildReportsPageModel", () => {
  it("builds live summary metrics and project breakdown from weekly reports data", () => {
    const report: SavedWeeklyReportData = {
      report: [
        {
          billable_seconds: [7200, 0, 0, 0, 0, 0, 0],
          project_hex_color: "#FF8800",
          project_name: "Client Work",
          seconds: [7200, 0, 0, 0, 0, 0, 0],
          user_id: 10,
          user_name: "Alice",
        },
        {
          billable_seconds: [0, 0, 0, 0, 0, 0, 0],
          project_hex_color: "#FF8800",
          project_name: "Client Work",
          seconds: [0, 1800, 0, 0, 0, 0, 0],
          user_id: 11,
          user_name: "Bob",
        },
        {
          billable_seconds: [0, 0, 0, 0, 0, 0, 0],
          project_hex_color: "#00AAFF",
          project_name: "Internal",
          seconds: [0, 3600, 0, 0, 0, 0, 0],
          user_id: 10,
          user_name: "Alice",
        },
      ],
      totals: {
        seconds: 12600,
        tracked_days: 2,
      },
    };

    const model = buildReportsPageModel({
      report,
      now: new Date("2026-03-24T13:00:00Z"),
      timezone: "UTC",
      weekStartsOn: 1,
    });

    expect(model.startDate).toBe("2026-03-23");
    expect(model.endDate).toBe("2026-03-29");
    expect(model.metrics).toEqual([
      { title: "Total Hours", value: "03:30:00" },
      { title: "Billable Hours", value: "02:00:00" },
      { title: "Amount", value: "-" },
      { title: "Average Daily Hours", value: "1.75 Hours" },
    ]);
    expect(model.totalDuration).toBe("03:30:00");
    expect(model.breakdownRows).toMatchObject([
      {
        color: "#FF8800",
        duration: "02:30:00",
        memberCount: 2,
        name: "Client Work",
        shareLabel: "71.43%",
      },
      {
        color: "#00AAFF",
        duration: "01:00:00",
        memberCount: 1,
        name: "Internal",
        shareLabel: "28.57%",
      },
    ]);
    expect(model.weekRows.slice(0, 2)).toEqual([
      { label: "Mon 03/23", seconds: 7200, value: "2:00:00" },
      { label: "Tue 03/24", seconds: 5400, value: "1:30:00" },
    ]);
  });
});
