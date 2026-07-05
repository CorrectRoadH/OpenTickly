import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import {
  buildShortcutItems,
  removeShortcutToken,
  resolveComposerShortcutMode,
  shortcutItemKey,
  type ShortcutMenuItem,
  type ShortcutMenuMode,
} from "./composer-shortcut-menu.ts";

export type UseComposerShortcutMenuParams = {
  /** Current timer description value. */
  value: string;
  /** Caret position inside the description input. */
  cursor: number;
  projectShortcutEnabled: boolean;
  tagsShortcutEnabled: boolean;
  projects: { id: number; name: string; color: string; active?: boolean }[];
  tags: { id: number; name: string }[];
  selectedTagIds: number[];
  /**
   * Called with the chosen item and the description with the trigger token
   * stripped out (the caller persists both in one step).
   */
  onSelect: (item: ShortcutMenuItem, nextValue: string) => void;
};

export type ComposerShortcutMenu = {
  isOpen: boolean;
  mode: ShortcutMenuMode | null;
  items: ShortcutMenuItem[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  selectItem: (index: number) => void;
  /** Handle a keydown on the description input; returns true when consumed. */
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => boolean;
};

export function useComposerShortcutMenu(
  params: UseComposerShortcutMenuParams,
): ComposerShortcutMenu {
  const {
    cursor,
    onSelect,
    projects,
    projectShortcutEnabled,
    selectedTagIds,
    tags,
    tagsShortcutEnabled,
    value,
  } = params;

  const resolved = resolveComposerShortcutMode(value, cursor, {
    projectShortcutEnabled,
    tagsShortcutEnabled,
  });
  const mode = resolved?.mode ?? null;
  const items = resolved
    ? buildShortcutItems({
        mode: resolved.mode,
        projects,
        query: resolved.query,
        selectedTagIds,
        tags,
      })
    : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Re-arm the menu whenever the description value changes after a dismissal.
  const previousValueRef = useRef(value);
  useEffect(() => {
    if (previousValueRef.current !== value) {
      previousValueRef.current = value;
      if (dismissed) {
        setDismissed(false);
      }
    }
  }, [value, dismissed]);

  // Keep the highlighted row valid as the filtered list changes.
  const signature = `${mode ?? ""}:${items.map(shortcutItemKey).join(",")}`;
  const previousSignatureRef = useRef(signature);
  useEffect(() => {
    if (previousSignatureRef.current !== signature) {
      previousSignatureRef.current = signature;
      setActiveIndex(0);
    }
  }, [signature]);

  const isOpen = mode != null && items.length > 0 && !dismissed;

  const selectItem = (index: number) => {
    const item = items[index];
    if (!item || !resolved) {
      return;
    }
    onSelect(item, removeShortcutToken(value, resolved.tokenStart, resolved.tokenEnd));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): boolean => {
    if (!isOpen) {
      return false;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % items.length);
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + items.length) % items.length);
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      selectItem(activeIndex);
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDismissed(true);
      return true;
    }
    return false;
  };

  return {
    activeIndex,
    handleKeyDown,
    isOpen,
    items,
    mode,
    selectItem,
    setActiveIndex,
  };
}
