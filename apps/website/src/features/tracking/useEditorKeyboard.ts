import { type Dispatch, useEffect } from "react";

import type { EditorUIAction, EditorUIState } from "./useEditorUIState.ts";

/**
 * Handles Escape key cascading close for the time entry editor dialog.
 * Closes the most-nested open panel first, then the editor itself.
 */
export function useEditorKeyboard(
  uiState: EditorUIState,
  dispatch: Dispatch<EditorUIAction>,
  onClose: () => void,
  isDirty: boolean,
): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (uiState.picker != null) {
          dispatch({ type: "SET_PICKER", picker: null });
          return;
        }
        if (uiState.timePicker != null) {
          dispatch({ type: "SET_TIME_PICKER", timePicker: null });
          return;
        }
        if (uiState.actionsMenuOpen) {
          dispatch({ type: "SET_ACTIONS_MENU", open: false });
          return;
        }
        if (uiState.descriptionSuggestionsOpen) {
          dispatch({ type: "SET_DESCRIPTION_SUGGESTIONS", open: false });
          return;
        }
        if (uiState.showDiscardConfirmation) {
          dispatch({ type: "SET_DISCARD_CONFIRMATION", show: false });
          return;
        }
        if (isDirty) {
          dispatch({ type: "SET_DISCARD_CONFIRMATION", show: true });
          return;
        }
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    onClose,
    isDirty,
    uiState.showDiscardConfirmation,
    uiState.picker,
    uiState.timePicker,
    uiState.actionsMenuOpen,
    uiState.descriptionSuggestionsOpen,
    dispatch,
  ]);
}
