import { useEffect } from "react";

/**
 * Handles Escape key and optional outside-click dismissal for modal dialogs.
 * Does NOT handle anchored panels (TimeEntryEditorDialog, TimerComposerSuggestionsDialog)
 * which have their own specialized dismiss logic.
 */
export function useDialogDismiss(onClose: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
}
