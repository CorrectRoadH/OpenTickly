import { useReducer } from "react";
import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  DEFAULT_PROJECT_COLOR,
  resolveProjectColorValue,
} from "../../shared/lib/project-colors.ts";

export type ProjectFormState = {
  editorMode: "create" | "edit" | null;
  editorProject: GithubComTogglTogglApiInternalModelsProject | null;
  name: string;
  color: string;
  isPrivate: boolean;
  template: boolean;
  clientId: number | null;
  billable: boolean;
  startDate: string;
  endDate: string;
  recurring: boolean;
  estimatedHours: number;
  fixedFee: number;
  memberRole: "manager" | "regular";
  selectedMemberIds: number[];
  error: string | null;
};

export type ProjectFormAction =
  | { type: "OPEN_CREATE" }
  | { type: "OPEN_EDIT"; project: GithubComTogglTogglApiInternalModelsProject }
  | { type: "CLOSE" }
  | { type: "SET_NAME"; value: string }
  | { type: "SET_COLOR"; value: string }
  | { type: "SET_PRIVATE"; value: boolean }
  | { type: "SET_TEMPLATE"; value: boolean }
  | { type: "SET_CLIENT_ID"; value: number | null }
  | { type: "SET_BILLABLE"; value: boolean }
  | { type: "SET_START_DATE"; value: string }
  | { type: "SET_END_DATE"; value: string }
  | { type: "SET_RECURRING"; value: boolean }
  | { type: "SET_ESTIMATED_HOURS"; value: number }
  | { type: "SET_FIXED_FEE"; value: number }
  | { type: "SET_MEMBER_ROLE"; value: "manager" | "regular" }
  | { type: "SET_MEMBER_IDS"; ids: number[] }
  | { type: "SET_ERROR"; error: string | null };

const DEFAULT_STATE: ProjectFormState = {
  editorMode: null,
  editorProject: null,
  name: "",
  color: DEFAULT_PROJECT_COLOR,
  isPrivate: false,
  template: false,
  clientId: null,
  billable: false,
  startDate: "",
  endDate: "",
  recurring: false,
  estimatedHours: 0,
  fixedFee: 0,
  memberRole: "regular",
  selectedMemberIds: [],
  error: null,
};

function reducer(state: ProjectFormState, action: ProjectFormAction): ProjectFormState {
  switch (action.type) {
    case "OPEN_CREATE":
      return { ...DEFAULT_STATE, editorMode: "create" };
    case "OPEN_EDIT":
      return {
        ...state,
        editorMode: "edit",
        editorProject: action.project,
        name: action.project.name ?? "",
        color: resolveProjectColorValue(action.project),
        isPrivate: action.project.is_private === true,
        template: action.project.template === true,
        clientId: action.project.client_id ?? null,
        billable: action.project.billable === true,
        startDate: action.project.start_date ?? "",
        endDate: action.project.end_date ?? "",
        recurring: action.project.recurring === true,
        estimatedHours: action.project.estimated_hours ?? 0,
        fixedFee: action.project.fixed_fee ?? 0,
        memberRole: "regular",
        error: null,
      };
    case "CLOSE":
      return { ...state, editorMode: null, editorProject: null };
    case "SET_NAME":
      return { ...state, name: action.value };
    case "SET_COLOR":
      return { ...state, color: action.value };
    case "SET_PRIVATE":
      return { ...state, isPrivate: action.value };
    case "SET_TEMPLATE":
      return { ...state, template: action.value };
    case "SET_CLIENT_ID":
      return { ...state, clientId: action.value };
    case "SET_BILLABLE":
      return { ...state, billable: action.value };
    case "SET_START_DATE":
      return { ...state, startDate: action.value };
    case "SET_END_DATE":
      return { ...state, endDate: action.value };
    case "SET_RECURRING":
      return { ...state, recurring: action.value };
    case "SET_ESTIMATED_HOURS":
      return { ...state, estimatedHours: action.value };
    case "SET_FIXED_FEE":
      return { ...state, fixedFee: action.value };
    case "SET_MEMBER_ROLE":
      return { ...state, memberRole: action.value };
    case "SET_MEMBER_IDS":
      return { ...state, selectedMemberIds: action.ids };
    case "SET_ERROR":
      return { ...state, error: action.error };
  }
}

export function useProjectForm(): [ProjectFormState, React.Dispatch<ProjectFormAction>] {
  return useReducer(reducer, DEFAULT_STATE);
}
