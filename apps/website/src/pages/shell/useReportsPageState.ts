import { useCallback, useMemo, useState } from "react";

import {
  type ReportsDateRange,
  type ReportsTimePeriod,
  getDateRangeForPeriod,
  shiftWeekRange,
} from "./reports-date-utils.ts";

export type ReportsFilters = {
  projectIds: number[];
  tagIds: number[];
};

export type BreakdownDimension = "projects" | "clients" | "entries";
export type SliceDimension = "projects" | "clients" | "members";

type ReportsPageState = {
  /** How the breakdown table groups rows */
  breakdownBy: BreakdownDimension;
  /** Selected client names for filtering */
  clientFilter: string[];
  /** The active date range sent to the query */
  dateRange: ReportsDateRange;
  /** Set of expanded breakdown row names */
  expandedRows: Set<string>;
  /** Active filters */
  filters: ReportsFilters;
  /** Navigate to the next period */
  goNext: () => void;
  /** Navigate to the previous period */
  goPrev: () => void;
  /** Selected member names for filtering */
  memberFilter: string[];
  /** Whether the period picker dropdown is open */
  periodPickerOpen: boolean;
  /** Select a named time period */
  selectPeriod: (period: ReportsTimePeriod) => void;
  /** Update the breakdown dimension */
  setBreakdownBy: (dim: BreakdownDimension) => void;
  /** Update the client filter */
  setClientFilter: (names: string[]) => void;
  /** Update the member filter */
  setMemberFilter: (names: string[]) => void;
  /** Toggle the period picker dropdown */
  setPeriodPickerOpen: (open: boolean) => void;
  /** Update the slice dimension */
  setSliceBy: (dim: SliceDimension) => void;
  /** How the donut chart groups slices */
  sliceBy: SliceDimension;
  /** Toggle a breakdown row's expanded state */
  toggleRow: (name: string) => void;
  /** Update filters */
  updateFilters: (patch: Partial<ReportsFilters>) => void;
};

/**
 * Manages all interactive state for the Reports page:
 * date range navigation, filters, and breakdown row expansion.
 */
export function useReportsPageState(timezone: string, weekStartsOn: number): ReportsPageState {
  const initialRange = useMemo(
    () => getDateRangeForPeriod("this_week", timezone, weekStartsOn),
    [timezone, weekStartsOn],
  );

  const [dateRange, setDateRange] = useState<ReportsDateRange>(initialRange);
  const [filters, setFilters] = useState<ReportsFilters>({ projectIds: [], tagIds: [] });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [breakdownBy, setBreakdownBy] = useState<BreakdownDimension>("projects");
  const [sliceBy, setSliceBy] = useState<SliceDimension>("projects");
  const [memberFilter, setMemberFilter] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState<string[]>([]);

  const goPrev = useCallback(() => {
    setDateRange((prev) => shiftWeekRange(prev, "prev"));
  }, []);

  const goNext = useCallback(() => {
    setDateRange((prev) => shiftWeekRange(prev, "next"));
  }, []);

  const selectPeriod = useCallback(
    (period: ReportsTimePeriod) => {
      setDateRange(getDateRangeForPeriod(period, timezone, weekStartsOn));
      setPeriodPickerOpen(false);
    },
    [timezone, weekStartsOn],
  );

  const toggleRow = useCallback((name: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const updateFilters = useCallback((patch: Partial<ReportsFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  return {
    breakdownBy,
    clientFilter,
    dateRange,
    expandedRows,
    filters,
    goNext,
    goPrev,
    memberFilter,
    periodPickerOpen,
    selectPeriod,
    setBreakdownBy,
    setClientFilter,
    setMemberFilter,
    setPeriodPickerOpen,
    setSliceBy,
    sliceBy,
    toggleRow,
    updateFilters,
  };
}
