export function resolveTimeEntryProjectId(entry: {
  pid?: number | null;
  project_id?: number | null;
}): number | null {
  return entry.project_id !== undefined ? entry.project_id : (entry.pid ?? null);
}
