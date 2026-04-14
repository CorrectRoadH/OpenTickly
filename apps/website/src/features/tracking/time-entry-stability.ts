import type {
  GithubComTogglTogglApiInternalModelsTimeEntry,
  ModelsTimeEntrySharedWith,
} from "../../shared/api/generated/public-track/types.gen.ts";
import type { DisplayEntry, EntryGroup } from "./overview-data.ts";

function shallowPrimitiveArrayEqual<T>(left?: T[] | null, right?: T[] | null): boolean {
  if (left === right) return true;
  const leftItems = left ?? [];
  const rightItems = right ?? [];
  if (leftItems.length !== rightItems.length) return false;
  return leftItems.every((item, index) => item === rightItems[index]);
}

function shallowSharedWithEqual(
  left?: ModelsTimeEntrySharedWith[] | null,
  right?: ModelsTimeEntrySharedWith[] | null,
): boolean {
  if (left === right) return true;
  const leftItems = left ?? [];
  const rightItems = right ?? [];
  if (leftItems.length !== rightItems.length) return false;
  return leftItems.every((item, index) => {
    const other = rightItems[index];
    return (
      item?.accepted === other?.accepted &&
      item?.user_id === other?.user_id &&
      item?.user_name === other?.user_name
    );
  });
}

function getEntryStabilityKey(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  index: number,
): string {
  if (typeof entry.id === "number") return `id:${entry.id}`;
  return [
    entry.workspace_id ?? entry.wid ?? "workspace",
    entry.start ?? entry.at ?? "start",
    entry.stop ?? "stop",
    entry.description ?? "description",
    index,
  ].join(":");
}

export function areTimeEntriesEquivalent(
  left: GithubComTogglTogglApiInternalModelsTimeEntry,
  right: GithubComTogglTogglApiInternalModelsTimeEntry,
): boolean {
  return (
    left.id === right.id &&
    left.billable === right.billable &&
    left.client_id === right.client_id &&
    left.client_name === right.client_name &&
    left.description === right.description &&
    left.duration === right.duration &&
    left.duronly === right.duronly &&
    shallowPrimitiveArrayEqual(left.expense_ids, right.expense_ids) &&
    shallowPrimitiveArrayEqual(left.permissions, right.permissions) &&
    left.pid === right.pid &&
    left.project_active === right.project_active &&
    left.project_billable === right.project_billable &&
    left.project_color === right.project_color &&
    left.project_id === right.project_id &&
    left.project_name === right.project_name &&
    left.server_deleted_at === right.server_deleted_at &&
    shallowSharedWithEqual(left.shared_with, right.shared_with) &&
    left.start === right.start &&
    left.stop === right.stop &&
    shallowPrimitiveArrayEqual(left.tag_ids, right.tag_ids) &&
    shallowPrimitiveArrayEqual(left.tags, right.tags) &&
    left.task_id === right.task_id &&
    left.task_name === right.task_name &&
    left.tid === right.tid &&
    left.uid === right.uid &&
    left.user_avatar_url === right.user_avatar_url &&
    left.user_id === right.user_id &&
    left.user_name === right.user_name &&
    left.wid === right.wid &&
    left.workspace_id === right.workspace_id
  );
}

export function stabilizeTimeEntryList(
  previousEntries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  nextEntries: GithubComTogglTogglApiInternalModelsTimeEntry[],
): GithubComTogglTogglApiInternalModelsTimeEntry[] {
  if (previousEntries.length === 0) {
    return nextEntries;
  }

  const previousByKey = new Map(
    previousEntries.map((entry, index) => [getEntryStabilityKey(entry, index), entry]),
  );
  const stabilized = nextEntries.map((entry, index) => {
    const previous = previousByKey.get(getEntryStabilityKey(entry, index));
    return previous && areTimeEntriesEquivalent(previous, entry) ? previous : entry;
  });

  return previousEntries.length === stabilized.length &&
    previousEntries.every((entry, index) => entry === stabilized[index])
    ? previousEntries
    : stabilized;
}

function areDisplayEntriesEquivalent(left: DisplayEntry, right: DisplayEntry): boolean {
  return (
    areTimeEntriesEquivalent(left, right) &&
    left._groupCount === right._groupCount &&
    shallowPrimitiveArrayEqual(left._groupEntryIds, right._groupEntryIds)
  );
}

/**
 * Reference-stability contract for list-view project rows.
 *
 * `ConnectedListView` derives its `projects` prop via
 * `projectOptions.filter().map().sort()` on every render, producing fresh
 * `{ id, name, color, pinned, clientName }` objects each time. The
 * `ListEntryRow` memo boundary falls back on per-item identity via
 * `shallowListEqual`, so these fresh objects defeat the memo and cascade
 * into every list row on every ConnectedListView re-render — which is
 * what lets a single tag-toggle mutation bump `renders: N` on every
 * sibling row. Re-using prior item references when the visible fields
 * match closes that gap.
 */
export type StableListViewProject = {
  clientName?: string;
  color: string;
  id: number;
  name: string;
  pinned: boolean;
};

function areListViewProjectsEquivalent(
  left: StableListViewProject,
  right: StableListViewProject,
): boolean {
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.color === right.color &&
    left.pinned === right.pinned &&
    left.clientName === right.clientName
  );
}

export function stabilizeListViewProjects(
  previous: StableListViewProject[],
  next: StableListViewProject[],
): StableListViewProject[] {
  if (
    previous.length === next.length &&
    previous.every((item, index) => {
      const candidate = next[index];
      return candidate !== undefined && areListViewProjectsEquivalent(item, candidate);
    })
  ) {
    return previous;
  }

  const previousById = new Map(previous.map((item) => [item.id, item]));
  return next.map((item) => {
    const prior = previousById.get(item.id);
    return prior && areListViewProjectsEquivalent(prior, item) ? prior : item;
  });
}

/**
 * Reference-stability contract for list-view tag rows.
 *
 * The items inside `tagOptions` already come from the react-query cache
 * with stable identity, but the containing array is rebuilt by
 * `normalizeTags` on every render. `shallowListEqual` still passes
 * because per-item identity holds — but stabilizing the array itself
 * lets the memo boundary short-circuit via `prev === next` in O(1)
 * instead of O(N).
 */
export type StableListViewTag = {
  id: number;
  name: string;
};

export function stabilizeListViewTags(
  previous: StableListViewTag[],
  next: StableListViewTag[],
): StableListViewTag[] {
  if (previous.length === next.length && previous.every((item, index) => item === next[index])) {
    return previous;
  }
  return next;
}

export function stabilizeEntryGroups(
  previousGroups: EntryGroup[],
  nextGroups: EntryGroup[],
): EntryGroup[] {
  if (previousGroups.length === 0) {
    return nextGroups;
  }

  const previousByKey = new Map(previousGroups.map((group) => [group.key, group]));
  const stabilized = nextGroups.map((group) => {
    const previous = previousByKey.get(group.key);
    if (!previous || previous.totalSeconds !== group.totalSeconds) {
      return group;
    }

    const stabilizedEntries = group.entries.map((entry, index) => {
      const previousEntry = previous.entries[index];
      return previousEntry && areDisplayEntriesEquivalent(previousEntry, entry)
        ? previousEntry
        : entry;
    });

    if (
      previous.entries.length === stabilizedEntries.length &&
      previous.entries.every((entry, index) => entry === stabilizedEntries[index])
    ) {
      return previous;
    }

    return { ...group, entries: stabilizedEntries };
  });

  return previousGroups.length === stabilized.length &&
    previousGroups.every((group, index) => group === stabilized[index])
    ? previousGroups
    : stabilized;
}
