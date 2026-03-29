import { useReducer } from "react";
import type { ProjectStatusFilter } from "../../shared/url-state/projects-location.ts";

export type ProjectCategory = "upcoming" | "active" | "archived" | "ended";

export type ProjectFilterState = {
  filterClientIds: Set<number>;
  filterMemberIds: Set<number>;
  filterBillable: "all" | "billable" | "non-billable";
  filterName: string;
  filterTemplate: "all" | "template" | "non-template";
  openFilter: string | null;
  selectedStatuses: Set<ProjectCategory>;
};

export type ProjectFilterAction =
  | { type: "TOGGLE_CLIENT_ID"; id: number }
  | { type: "CLEAR_CLIENT_IDS" }
  | { type: "TOGGLE_MEMBER_ID"; id: number }
  | { type: "CLEAR_MEMBER_IDS" }
  | { type: "SET_BILLABLE"; value: "all" | "billable" | "non-billable" }
  | { type: "SET_NAME"; name: string }
  | { type: "SET_TEMPLATE"; value: "all" | "template" | "non-template" }
  | { type: "SET_OPEN_FILTER"; filter: string | null }
  | { type: "TOGGLE_STATUS"; status: ProjectCategory }
  | { type: "SET_STATUSES"; statuses: Set<ProjectCategory> }
  | { type: "RESET" };

const DEFAULT_SELECTED_STATUSES: Set<ProjectCategory> = new Set(["upcoming", "active", "ended"]);

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function computeInitialStatuses(statusFilter: ProjectStatusFilter): Set<ProjectCategory> {
  if (statusFilter === "active") return new Set<ProjectCategory>(["active"]);
  if (statusFilter === "archived") return new Set<ProjectCategory>(["archived"]);
  return new Set(DEFAULT_SELECTED_STATUSES);
}

function createInitialState(statusFilter: ProjectStatusFilter): ProjectFilterState {
  return {
    filterClientIds: new Set(),
    filterMemberIds: new Set(),
    filterBillable: "all",
    filterName: "",
    filterTemplate: "all",
    openFilter: null,
    selectedStatuses: computeInitialStatuses(statusFilter),
  };
}

function reducer(state: ProjectFilterState, action: ProjectFilterAction): ProjectFilterState {
  switch (action.type) {
    case "TOGGLE_CLIENT_ID":
      return { ...state, filterClientIds: toggleInSet(state.filterClientIds, action.id) };
    case "CLEAR_CLIENT_IDS":
      return { ...state, filterClientIds: new Set() };
    case "TOGGLE_MEMBER_ID":
      return { ...state, filterMemberIds: toggleInSet(state.filterMemberIds, action.id) };
    case "CLEAR_MEMBER_IDS":
      return { ...state, filterMemberIds: new Set() };
    case "SET_BILLABLE":
      return { ...state, filterBillable: action.value };
    case "SET_NAME":
      return { ...state, filterName: action.name };
    case "SET_TEMPLATE":
      return { ...state, filterTemplate: action.value };
    case "SET_OPEN_FILTER":
      return { ...state, openFilter: action.filter };
    case "TOGGLE_STATUS":
      return { ...state, selectedStatuses: toggleInSet(state.selectedStatuses, action.status) };
    case "SET_STATUSES":
      return { ...state, selectedStatuses: action.statuses };
    case "RESET":
      return {
        filterClientIds: new Set(),
        filterMemberIds: new Set(),
        filterBillable: "all",
        filterName: "",
        filterTemplate: "all",
        openFilter: null,
        selectedStatuses: new Set(DEFAULT_SELECTED_STATUSES),
      };
  }
}

export function useProjectFilters(
  statusFilter: ProjectStatusFilter,
): [ProjectFilterState, React.Dispatch<ProjectFilterAction>] {
  return useReducer(reducer, statusFilter, createInitialState);
}
