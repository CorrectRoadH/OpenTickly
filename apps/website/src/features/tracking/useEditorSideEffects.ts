import { type Dispatch, useEffect } from "react";

import type { EditorUIAction, EditorUIState } from "./useEditorUIState.ts";
import type { DescriptionMode } from "./time-entry-editor-utils.ts";

/**
 * Encapsulates the four side-effect hooks used by the editor dialog:
 * 1. Outside-click dismiss
 * 2. Description-mode sync (open/close suggestions)
 * 3. Auto-clear time input errors after 2 s
 * 4. Close picker on click outside picker area
 */
export function useEditorSideEffects(
  ui: EditorUIState,
  dispatch: Dispatch<EditorUIAction>,
  onClose: () => void,
  isDirty: boolean,
  description: string,
  descriptionMode: DescriptionMode,
): void {
  const { picker, timeInputError } = ui;

  // 1. Close on outside click
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        !target.closest('[data-testid="time-entry-editor-dialog"]') &&
        !target.closest('[data-testid="split-time-entry-dialog"]') &&
        !target.closest('[role="menu"]')
      ) {
        if (isDirty) {
          dispatch({ type: "SET_DISCARD_CONFIRMATION", show: true });
          return;
        }
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClose, isDirty, dispatch]);

  // 2. Description mode sync
  useEffect(() => {
    if (
      descriptionMode === "project" ||
      descriptionMode === "tag" ||
      descriptionMode === "billable"
    ) {
      dispatch({ type: "SET_PICKER", picker: null });
      dispatch({ type: "SET_DESCRIPTION_SUGGESTIONS", open: true });
      return;
    }

    if (!description.trim()) {
      dispatch({ type: "SET_DESCRIPTION_SUGGESTIONS", open: true });
      return;
    }

    dispatch({ type: "SET_DESCRIPTION_SUGGESTIONS", open: false });
  }, [description, descriptionMode, dispatch]);

  // 3. Auto-clear time input errors
  useEffect(() => {
    if (timeInputError == null) {
      return;
    }
    const timer = window.setTimeout(
      () => dispatch({ type: "SET_TIME_INPUT_ERROR", error: null }),
      2000,
    );
    return () => window.clearTimeout(timer);
  }, [timeInputError, dispatch]);

  // 4. Close picker on click outside picker area
  useEffect(() => {
    if (!picker) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-testid="time-entry-editor-dialog"]') &&
        !target.closest("[data-picker-area]")
      ) {
        dispatch({ type: "SET_PICKER", picker: null });
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [picker, dispatch]);
}
