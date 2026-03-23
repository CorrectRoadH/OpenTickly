import { z } from "zod";

export const shellViewSearchSchema = z.object({
  view: z.enum(["list", "calendar", "timesheet"]).catch("list"),
});

export type ShellViewMode = z.infer<typeof shellViewSearchSchema>["view"];

export function parseShellViewSearch(search: unknown) {
  return shellViewSearchSchema.parse(search);
}
