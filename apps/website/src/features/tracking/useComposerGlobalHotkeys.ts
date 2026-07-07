import { useEffect } from "react";

import type { useTimerComposer } from "./useTimerComposer.ts";

/**
 * Global keyboard shortcuts for the composer bar: "?" toggles the shortcuts
 * dialog, "n" focuses the description input, "s" stops the running entry.
 */
export function useComposerGlobalHotkeys({
  composer,
  onShortcutsToggle,
}: {
  composer: ReturnType<typeof useTimerComposer>;
  onShortcutsToggle: () => void;
}): void {
  // Keyboard shortcuts
  const handleGlobalKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }

    if (event.key === "?") {
      event.preventDefault();
      onShortcutsToggle();
      return;
    }

    if (event.key === "n") {
      event.preventDefault();
      composer.timerDescriptionInputRef.current?.focus();
      return;
    }

    if (event.key === "s" && composer.runningEntry?.id != null) {
      event.preventDefault();
      void composer.handleTimerAction();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  });
}
