/**
 * Logic for the timer composer "@ / #" inline shortcut menus.
 *
 * Typing `@` opens a project picker and `#` opens a tag picker, filtered by
 * the text between the trigger char and the cursor. A trigger counts only at
 * the start of the value or after whitespace, so emails and mid-word chars
 * stay plain text. Both menus are gated behind the user's keyboard-shortcut
 * preferences. This mirrors the time-entry editor's description-mode behaviour
 * but is preference-aware and limited to projects/tags (the composer has a
 * dedicated billable button).
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

export type ShortcutMenuMatch = {
  mode: ShortcutMenuMode;
  query: string;
  /** Index of the trigger char in the value. */
  tokenStart: number;
  /** End of the token (the cursor position the match was resolved for). */
  tokenEnd: number;
};

const TRIGGER_MODES: Record<string, ShortcutMenuMode> = { "#": "tag", "@": "project" };

export function resolveComposerShortcutMode(
  value: string,
  cursor: number,
  preferences: ShortcutMenuPreferences,
): ShortcutMenuMatch | null {
  const enabledFor: Record<ShortcutMenuMode, boolean> = {
    project: preferences.projectShortcutEnabled,
    tag: preferences.tagsShortcutEnabled,
  };

  for (let index = Math.min(cursor, value.length) - 1; index >= 0; index -= 1) {
    const mode = TRIGGER_MODES[value[index]];
    if (mode == null) {
      continue;
    }
    const atWordStart = index === 0 || /\s/.test(value[index - 1]);
    if (!atWordStart || !enabledFor[mode]) {
      continue;
    }
    return {
      mode,
      query: value.slice(index + 1, cursor),
      tokenEnd: cursor,
      tokenStart: index,
    };
  }

  return null;
}

/** Removes the trigger token from the value, collapsing the whitespace around it. */
export function removeShortcutToken(value: string, tokenStart: number, tokenEnd: number): string {
  let before = value.slice(0, tokenStart);
  let after = value.slice(tokenEnd);
  if (before.endsWith(" ") && (after === "" || after.startsWith(" "))) {
    before = before.slice(0, -1);
  }
  if (before === "" && after.startsWith(" ")) {
    after = after.slice(1);
  }
  return before + after;
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
