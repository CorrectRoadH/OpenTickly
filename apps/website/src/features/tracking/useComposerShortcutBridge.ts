import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

import type { useCreateTagMutation } from "../../shared/query/web-shell.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import type { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { applyComposerShortcutSelection } from "./composer-shortcut-selection.ts";
import { useComposerShortcutMenu } from "./useComposerShortcutMenu.ts";
import type { useTimerComposer } from "./useTimerComposer.ts";
import type { useWorkspaceData } from "./useWorkspaceData.ts";

/** Reads the new tag's id from a create-tag response (array- or object-shaped). */
function resolveCreatedTagId(created: unknown): number | undefined {
  const tag = Array.isArray(created) ? created[0] : created;
  if (tag && typeof tag === "object" && "id" in tag) {
    const id = (tag as { id?: unknown }).id;
    return typeof id === "number" ? id : undefined;
  }
  return undefined;
}

/**
 * Wires the inline "@" (project) / "#" (tag) shortcut menu into the composer:
 * tracks the description cursor, applies shortcut selections, and closes the
 * focus suggestions dialog while the shortcut menu is open.
 */
export function useComposerShortcutBridge({
  composer,
  createTagMutation,
  preferences,
  projectOptions,
  tagOptions,
}: {
  composer: ReturnType<typeof useTimerComposer>;
  createTagMutation: ReturnType<typeof useCreateTagMutation>;
  preferences: ReturnType<typeof useUserPreferences>;
  projectOptions: ReturnType<typeof useWorkspaceData>["projectOptions"];
  tagOptions: ReturnType<typeof useWorkspaceData>["tagOptions"];
}): {
  setDescriptionCursor: Dispatch<SetStateAction<number>>;
  shortcutMenu: ReturnType<typeof useComposerShortcutMenu>;
} {
  // Inline "@" (project) / "#" (tag) shortcut menu for the composer.
  const [descriptionCursor, setDescriptionCursor] = useState(0);
  const shortcutMenu = useComposerShortcutMenu({
    cursor: descriptionCursor,
    onSelect: (item, nextValue) => {
      applyComposerShortcutSelection(
        {
          createTag: (name) =>
            createTagMutation.mutateAsync(name).then((created) => resolveCreatedTagId(created)),
          draftTagIds: composer.draftTagIds,
          projectOptions,
          runningEntry: composer.runningEntry,
          setDraftDescription: composer.setDraftDescription,
          setDraftProjectId: composer.setDraftProjectId,
          setDraftTagIds: composer.setDraftTagIds,
          setDraftTaskId: composer.setDraftTaskId,
          setRunningDescription: composer.setRunningDescription,
          updateTimeEntry: composer.updateTimeEntryMutation.mutateAsync,
        },
        item,
        nextValue,
      );
    },
    projects: projectOptions
      .filter((project): project is typeof project & { id: number } => project.id != null)
      .map((project) => ({
        active: project.active,
        color: resolveProjectColorValue(project),
        id: project.id,
        name: project.name ?? "Untitled project",
      })),
    projectShortcutEnabled: preferences.projectShortcutEnabled,
    selectedTagIds:
      composer.runningEntry?.id != null
        ? (composer.runningEntry.tag_ids ?? [])
        : composer.draftTagIds,
    tags: tagOptions,
    tagsShortcutEnabled: preferences.tagsShortcutEnabled,
    value: composer.timerDescriptionValue,
  });

  // The inline shortcut menu and the focus suggestions dialog must not overlap.
  const shortcutMenuOpen = shortcutMenu.isOpen;
  const { closeComposerSuggestions, composerSuggestionsAnchor } = composer;
  useEffect(() => {
    if (shortcutMenuOpen && composerSuggestionsAnchor) {
      closeComposerSuggestions();
    }
  }, [shortcutMenuOpen, composerSuggestionsAnchor, closeComposerSuggestions]);

  return { setDescriptionCursor, shortcutMenu };
}
