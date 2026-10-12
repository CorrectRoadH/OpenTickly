import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { postReportsApiV3WorkspaceByWorkspaceIdSearchTimeEntries } from "../api/public/reports/index.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import type { WeeklyReportQueryOptions } from "./web-shell.ts";

// The upstream schema declares this response as a string. Validate the actual
// detailed-report wire shape at the adapter boundary; dur is milliseconds.
const durationsSchema = z.array(z.object({ id: z.number(), dur: z.number() }));

export function useReportEntryDurations(workspaceId: number, options: WeeklyReportQueryOptions) {
  return useQuery({
    queryKey: ["report-entry-durations", workspaceId, options],
    queryFn: async () => {
      const payload = await unwrapWebApiResult(
        postReportsApiV3WorkspaceByWorkspaceIdSearchTimeEntries({
          path: { workspace_id: workspaceId },
          body: {
            start_date: options.startDate,
            end_date: options.endDate,
            rounding: options.rounding,
            rounding_minutes: options.roundingMinutes,
            description: options.description,
            project_ids: options.projectIds,
            tag_ids: options.tagIds,
          },
        }),
      );
      return new Map(
        durationsSchema
          .parse(typeof payload === "string" ? JSON.parse(payload) : payload)
          .map((entry) => [entry.id, entry.dur / 1000]),
      );
    },
  });
}
