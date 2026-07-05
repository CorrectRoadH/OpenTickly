import type { ShortcutMenuItem } from "./composer-shortcut-menu.ts";

export type ShortcutSelectionDeps = {
  runningEntry: {
    id?: number | null;
    tag_ids?: number[] | null;
    wid?: number | null;
    workspace_id?: number | null;
  } | null;
  draftTagIds: number[];
  projectOptions: { color?: string | null; id?: number | null; name?: string | null }[];
  createTag: (name: string) => Promise<number | undefined>;
  setDraftDescription: (value: string) => void;
  setDraftProjectId: (id: number | null) => void;
  setDraftTagIds: (ids: number[]) => void;
  setDraftTaskId: (id: number | null) => void;
  setRunningDescription: (value: string) => void;
  updateTimeEntry: (args: {
    request: {
      description?: string;
      projectColor?: string | null;
      projectId?: number | null;
      projectName?: string | null;
      tagIds?: number[];
      taskId?: number | null;
    };
    timeEntryId: number;
    workspaceId: number;
  }) => Promise<unknown>;
};

/**
 * Applies a shortcut-menu selection to the composer. For an idle composer the
 * draft state is updated; for a running entry the project/tag change and the
 * token-stripped description are persisted in a single update so neither write
 * clobbers the other.
 */
export function applyComposerShortcutSelection(
  deps: ShortcutSelectionDeps,
  item: ShortcutMenuItem,
  nextValue: string,
): void {
  const running = deps.runningEntry;
  const runningId = running?.id;
  if (running != null && runningId != null) {
    const workspaceId = running.workspace_id ?? running.wid;
    if (typeof workspaceId !== "number") {
      return;
    }
    deps.setRunningDescription(nextValue);
    const description = nextValue.trim();

    if (item.kind === "project") {
      const picked = deps.projectOptions.find((project) => project.id === item.id) ?? null;
      void deps.updateTimeEntry({
        request: {
          description,
          projectColor: picked?.color ?? null,
          projectId: item.id,
          projectName: picked?.name ?? null,
          taskId: null,
        },
        timeEntryId: runningId,
        workspaceId,
      });
      return;
    }

    const currentTagIds = running.tag_ids ?? [];
    if (item.kind === "tag") {
      void deps.updateTimeEntry({
        request: { description, tagIds: toggleTagId(currentTagIds, item.id) },
        timeEntryId: runningId,
        workspaceId,
      });
      return;
    }

    void deps.createTag(item.name).then((createdId) => {
      void deps.updateTimeEntry({
        request: {
          description,
          tagIds: createdId == null ? currentTagIds : toggleTagId(currentTagIds, createdId),
        },
        timeEntryId: runningId,
        workspaceId,
      });
    });
    return;
  }

  deps.setDraftDescription(nextValue);
  if (item.kind === "project") {
    deps.setDraftProjectId(item.id);
    deps.setDraftTaskId(null);
    return;
  }
  if (item.kind === "tag") {
    deps.setDraftTagIds(toggleTagId(deps.draftTagIds, item.id));
    return;
  }
  void deps.createTag(item.name).then((createdId) => {
    if (createdId != null && !deps.draftTagIds.includes(createdId)) {
      deps.setDraftTagIds([...deps.draftTagIds, createdId]);
    }
  });
}

function toggleTagId(tagIds: number[], tagId: number): number[] {
  return tagIds.includes(tagId) ? tagIds.filter((id) => id !== tagId) : [...tagIds, tagId];
}
