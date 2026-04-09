export function resolveTimeEntryProjectId(entry: {
  pid?: number | null;
  project_id?: number | null;
}): number | null {
  const id = entry.project_id !== undefined ? entry.project_id : (entry.pid ?? null);
  if (id == null || id <= 0) return null;
  return id;
}

export function toTrackIso(date: Date): string {
  return date.toISOString().replace(".000Z", "Z");
}
