import type {
  GithubComTogglTogglApiInternalModelsProject,
  GithubComTogglTogglApiInternalModelsTimeEntry,
  ModelsFavorite,
  ModelsTask,
} from "../../shared/api/generated/public-track/types.gen.ts";
import type { TimeEntrySearchItem } from "../../shared/api/generated/web/types.gen.ts";
import type { TimerComposerSuggestionsAnchor } from "./TimerComposerSuggestionsDialog.tsx";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";

export function resolveDialogPosition(anchor: TimerComposerSuggestionsAnchor) {
  return {
    left: Math.max(16, anchor.left),
    top: anchor.top + anchor.height + 12,
  };
}

export function buildPreviousEntries(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
): GithubComTogglTogglApiInternalModelsTimeEntry[] {
  const seen = new Set<string>();
  const suggestions: GithubComTogglTogglApiInternalModelsTimeEntry[] = [];

  for (const entry of entries) {
    const key = buildEntryKey(entry);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    suggestions.push(entry);
    if (suggestions.length >= 8) {
      break;
    }
  }

  return suggestions;
}

export function buildProjectSuggestions(
  projects: GithubComTogglTogglApiInternalModelsProject[],
): GithubComTogglTogglApiInternalModelsProject[] {
  const active = projects.filter((project) => project.id != null && project.active !== false);
  const pinned = active.filter((p) => p.pinned);
  const unpinned = active.filter((p) => !p.pinned);
  return [...pinned, ...unpinned].slice(0, 5);
}

export function buildEntryKey(entry: GithubComTogglTogglApiInternalModelsTimeEntry): string {
  return [
    entry.description?.trim().toLowerCase() || "",
    String(resolveTimeEntryProjectId(entry) ?? 0),
    (entry.tag_ids ?? []).join(","),
  ].join("::");
}

export function filterByQuery(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  query?: string,
): GithubComTogglTogglApiInternalModelsTimeEntry[] {
  const trimmed = query?.trim().toLowerCase();
  if (!trimmed) return entries;
  return entries.filter((entry) => {
    const desc = (entry.description ?? "").toLowerCase();
    const project = (entry.project_name ?? "").toLowerCase();
    return desc.includes(trimmed) || project.includes(trimmed);
  });
}

export function filterFavoritesByQuery(
  favorites: ModelsFavorite[],
  query?: string,
): ModelsFavorite[] {
  const trimmed = query?.trim().toLowerCase();
  if (!trimmed) return favorites;
  return favorites.filter((fav) => {
    const desc = (fav.description ?? "").toLowerCase();
    const project = (fav.project_name ?? "").toLowerCase();
    return desc.includes(trimmed) || project.includes(trimmed);
  });
}

export function searchItemToTimeEntry(
  item: TimeEntrySearchItem,
): GithubComTogglTogglApiInternalModelsTimeEntry {
  return {
    id: item.id,
    workspace_id: item.workspace_id,
    description: item.description,
    project_id: item.project_id,
    project_name: item.project_name,
    task_id: item.task_id,
    task_name: item.task_name,
    project_color: item.project_color,
    tag_ids: item.tag_ids,
    tags: item.tags,
    billable: item.billable,
    start: item.start,
    stop: item.stop,
    duration: item.duration,
  };
}

export function resolveTaskName(taskId: number, tasks: ModelsTask[]): string | undefined {
  return tasks.find((t) => t.id === taskId)?.name?.trim();
}

export function buildTaskSuggestions(
  tasks: ModelsTask[],
  projects: GithubComTogglTogglApiInternalModelsProject[],
): ModelsTask[] {
  const activeProjectIds = new Set(
    projects.filter((p) => p.active !== false && p.id != null).map((p) => p.id!),
  );
  return tasks
    .filter(
      (t) =>
        t.active !== false &&
        t.id != null &&
        t.project_id != null &&
        activeProjectIds.has(t.project_id),
    )
    .slice(0, 10);
}

export function filterTasksByQuery(tasks: ModelsTask[], query?: string): ModelsTask[] {
  const trimmed = query?.trim().toLowerCase();
  if (!trimmed) return tasks;
  return tasks.filter((task) => {
    const name = (task.name ?? "").toLowerCase();
    const projectName = (task.project_name ?? "").toLowerCase();
    return name.includes(trimmed) || projectName.includes(trimmed);
  });
}

export function filterProjectsByQuery(
  projects: GithubComTogglTogglApiInternalModelsProject[],
  query?: string,
): GithubComTogglTogglApiInternalModelsProject[] {
  const trimmed = query?.trim().toLowerCase();
  if (!trimmed) return projects;
  return projects.filter((project) => {
    const name = (project.name ?? "").toLowerCase();
    const client = (project.client_name ?? "").toLowerCase();
    return name.includes(trimmed) || client.includes(trimmed);
  });
}
