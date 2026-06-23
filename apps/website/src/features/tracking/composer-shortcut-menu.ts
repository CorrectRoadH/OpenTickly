/**
 * Logic for the timer composer "@ / #" inline shortcut menus.
 *
 * Typing `@` at the start of the timer description opens a project picker and
 * `#` opens a tag picker, each filtered by the text after the trigger char.
 * Both are gated behind the user's keyboard-shortcut preferences. This mirrors
 * the time-entry editor's description-mode behaviour but is preference-aware and
 * limited to projects/tags (the composer has a dedicated billable button).
 */

export type ShortcutMenuMode = "project" | "tag";

export type ShortcutMenuItem =
  | { kind: "project"; id: number; label: string; color: string }
  | { kind: "tag"; id: number; label: string; selected: boolean }
  | { kind: "create-tag"; label: string; name: string };

export type ShortcutMenuPreferences = {
  projectShortcutEnabled: boolean;
  tagsShortcutEnabled: boolean;
};

export function resolveComposerShortcutMode(
  value: string,
  preferences: ShortcutMenuPreferences,
): { mode: ShortcutMenuMode; query: string } | null {
  if (preferences.projectShortcutEnabled && value.startsWith("@")) {
    return { mode: "project", query: value.slice(1) };
  }

  if (preferences.tagsShortcutEnabled && value.startsWith("#")) {
    return { mode: "tag", query: value.slice(1) };
  }

  return null;
}

export function buildShortcutItems(input: {
  mode: ShortcutMenuMode;
  query: string;
  projects: { id: number; name: string; color: string; active?: boolean }[];
  tags: { id: number; name: string }[];
  selectedTagIds: number[];
}): ShortcutMenuItem[] {
  const trimmed = input.query.trim();
  const normalized = trimmed.toLowerCase();

  if (input.mode === "project") {
    return input.projects
      .filter((project) => project.active !== false)
      .filter((project) => normalized === "" || project.name.toLowerCase().includes(normalized))
      .map((project) => ({
        color: project.color,
        id: project.id,
        kind: "project",
        label: project.name,
      }));
  }

  const items: ShortcutMenuItem[] = input.tags
    .filter((tag) => normalized === "" || tag.name.toLowerCase().includes(normalized))
    .map((tag) => ({
      id: tag.id,
      kind: "tag",
      label: tag.name,
      selected: input.selectedTagIds.includes(tag.id),
    }));

  const hasExactMatch = input.tags.some((tag) => tag.name.toLowerCase() === normalized);
  if (trimmed !== "" && !hasExactMatch) {
    items.push({ kind: "create-tag", label: trimmed, name: trimmed });
  }

  return items;
}

export function shortcutItemKey(item: ShortcutMenuItem): string {
  if (item.kind === "create-tag") {
    return `create-tag:${item.name}`;
  }
  return `${item.kind}:${item.id}`;
}
