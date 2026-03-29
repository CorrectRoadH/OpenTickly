import { useReducer } from "react";

import { DEFAULT_PROJECT_COLOR } from "../../shared/lib/project-colors.ts";

export type EditorUIState = {
  actionsMenuOpen: boolean;
  descriptionSuggestionsOpen: boolean;
  picker: "project" | "tag" | null;
  projectColorPickerOpen: boolean;
  projectComposerOpen: boolean;
  projectCreateError: string | null;
  projectDraftColor: string;
  projectDraftName: string;
  search: string;
  showDiscardConfirmation: boolean;
  tagComposerOpen: boolean;
  tagDraftName: string;
  timeEditor: "start" | "stop" | null;
  timeInputError: "start" | "stop" | null;
  timePicker: "start" | "stop" | null;
  workspaceMenuOpen: boolean;
};

export type EditorUIAction =
  | { type: "SET_PICKER"; picker: EditorUIState["picker"] }
  | { type: "SET_TIME_PICKER"; timePicker: EditorUIState["timePicker"] }
  | { type: "SET_TIME_EDITOR"; timeEditor: EditorUIState["timeEditor"] }
  | { type: "SET_ACTIONS_MENU"; open: boolean }
  | { type: "SET_PROJECT_COMPOSER"; open: boolean }
  | { type: "SET_PROJECT_DRAFT_NAME"; name: string }
  | { type: "SET_PROJECT_DRAFT_COLOR"; color: string }
  | { type: "SET_PROJECT_COLOR_PICKER"; open: boolean }
  | { type: "SET_PROJECT_CREATE_ERROR"; error: string | null }
  | { type: "SET_TAG_COMPOSER"; open: boolean }
  | { type: "SET_TAG_DRAFT_NAME"; name: string }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_DISCARD_CONFIRMATION"; show: boolean }
  | { type: "SET_DESCRIPTION_SUGGESTIONS"; open: boolean }
  | { type: "SET_WORKSPACE_MENU"; open: boolean }
  | { type: "SET_TIME_INPUT_ERROR"; error: "start" | "stop" | null };

const initialState: EditorUIState = {
  actionsMenuOpen: false,
  descriptionSuggestionsOpen: false,
  picker: null,
  projectColorPickerOpen: false,
  projectComposerOpen: false,
  projectCreateError: null,
  projectDraftColor: DEFAULT_PROJECT_COLOR,
  projectDraftName: "",
  search: "",
  showDiscardConfirmation: false,
  tagComposerOpen: false,
  tagDraftName: "",
  timeEditor: null,
  timeInputError: null,
  timePicker: null,
  workspaceMenuOpen: false,
};

function editorUIReducer(state: EditorUIState, action: EditorUIAction): EditorUIState {
  switch (action.type) {
    case "SET_PICKER": {
      const next = { ...state, picker: action.picker };
      // Reset sub-state when picker changes (eliminates the cascading useEffect)
      if (action.picker !== "project") {
        next.projectComposerOpen = false;
        next.projectDraftName = "";
        next.workspaceMenuOpen = false;
      }
      if (action.picker !== "tag") {
        next.tagComposerOpen = false;
        next.tagDraftName = "";
      }
      if (action.picker == null) {
        next.search = "";
      }
      if (action.picker != null) {
        next.timePicker = null;
        next.timeEditor = null;
        next.actionsMenuOpen = false;
      }
      return next;
    }
    case "SET_TIME_PICKER":
      return {
        ...state,
        timePicker: action.timePicker,
        // When time picker opens, close description suggestions
        descriptionSuggestionsOpen:
          action.timePicker != null ? false : state.descriptionSuggestionsOpen,
      };
    case "SET_TIME_EDITOR":
      return {
        ...state,
        timeEditor: action.timeEditor,
        // When time editor opens, close time picker and description suggestions
        timePicker: action.timeEditor != null ? null : state.timePicker,
        descriptionSuggestionsOpen:
          action.timeEditor != null ? false : state.descriptionSuggestionsOpen,
      };
    case "SET_ACTIONS_MENU":
      return { ...state, actionsMenuOpen: action.open };
    case "SET_PROJECT_COMPOSER":
      return { ...state, projectComposerOpen: action.open };
    case "SET_PROJECT_DRAFT_NAME":
      return { ...state, projectDraftName: action.name };
    case "SET_PROJECT_DRAFT_COLOR":
      return { ...state, projectDraftColor: action.color };
    case "SET_PROJECT_COLOR_PICKER":
      return { ...state, projectColorPickerOpen: action.open };
    case "SET_PROJECT_CREATE_ERROR":
      return { ...state, projectCreateError: action.error };
    case "SET_TAG_COMPOSER":
      return { ...state, tagComposerOpen: action.open };
    case "SET_TAG_DRAFT_NAME":
      return { ...state, tagDraftName: action.name };
    case "SET_SEARCH":
      return { ...state, search: action.query };
    case "SET_DISCARD_CONFIRMATION":
      return { ...state, showDiscardConfirmation: action.show };
    case "SET_DESCRIPTION_SUGGESTIONS":
      return { ...state, descriptionSuggestionsOpen: action.open };
    case "SET_WORKSPACE_MENU":
      return { ...state, workspaceMenuOpen: action.open };
    case "SET_TIME_INPUT_ERROR":
      return { ...state, timeInputError: action.error };
  }
}

export function useEditorUIState() {
  return useReducer(editorUIReducer, initialState);
}
