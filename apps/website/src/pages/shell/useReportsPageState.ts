import { useCallback, useMemo, useState } from "react";

import {
  type ReportsDateRange,
  getDateRangeForPeriod,
  shiftWeekRange,
} from "./reports-date-utils.ts";

export type ReportsFilters = {
  description: string;
  projectIds: number[];
  tagIds: number[];
};

export type BreakdownDimension = "projects" | "clients" | "entries";
export type SliceDimension = "projects" | "clients" | "members";

type ReportsPageState = {
  /** Which shortcut is currently active (null when navigated via arrows/calendar) */
  activeShortcut: string | null;
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
  /** Set an arbitrary date range (clears active shortcut) */
  selectDateRange: (range: ReportsDateRange) => void;
  /** Set date range from a shortcut (tracks which shortcut is active) */
  selectShortcutRange: (shortcutId: string, range: ReportsDateRange) => void;
  /** Update the breakdown dimension */
  setBreakdownBy: (dim: BreakdownDimension) => void;
  /** Update the client filter */
  setClientFilter: (names: string[]) => void;
  /** Update the member filter */
  setMemberFilter: (names: string[]) => void;
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
export function useReportsPageState(
  timezone: string,
  weekStartsOn: number,
  initialProjectIds?: number[],
): ReportsPageState {
  const initialRange = useMemo(
    () => getDateRangeForPeriod("this_week", timezone, weekStartsOn),
    [timezone, weekStartsOn],
  );

  const [activeShortcut, setActiveShortcut] = useState<string | null>("this-week");
  const [dateRange, setDateRange] = useState<ReportsDateRange>(initialRange);
  const [filters, setFilters] = useState<ReportsFilters>({
    description: "",
    projectIds: initialProjectIds ?? [],
    tagIds: [],
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [breakdownBy, setBreakdownBy] = useState<BreakdownDimension>("projects");
  const [sliceBy, setSliceBy] = useState<SliceDimension>("projects");
  const [memberFilter, setMemberFilter] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState<string[]>([]);

  const goPrev = useCallback(() => {
    setDateRange((prev) => shiftWeekRange(prev, "prev"));
    setActiveShortcut(null);
  }, []);

  const goNext = useCallback(() => {
    setDateRange((prev) => shiftWeekRange(prev, "next"));
    setActiveShortcut(null);
  }, []);

  const selectDateRange = useCallback((range: ReportsDateRange) => {
    setDateRange(range);
    setActiveShortcut(null);
  }, []);

  const selectShortcutRange = useCallback((shortcutId: string, range: ReportsDateRange) => {
    setDateRange(range);
    setActiveShortcut(shortcutId);
  }, []);

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
    activeShortcut,
    breakdownBy,
    clientFilter,
    dateRange,
    expandedRows,
    filters,
    goNext,
    goPrev,
    memberFilter,
    selectDateRange,
    selectShortcutRange,
    setBreakdownBy,
    setClientFilter,
    setMemberFilter,
    setSliceBy,
    sliceBy,
    toggleRow,
    updateFilters,
  };
}
