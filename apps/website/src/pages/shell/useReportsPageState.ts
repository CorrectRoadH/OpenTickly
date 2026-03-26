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

type ReportsPageState = {
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
  /** Whether the period picker dropdown is open */
  periodPickerOpen: boolean;
  /** Select a named time period */
  selectPeriod: (period: ReportsTimePeriod) => void;
  /** Toggle the period picker dropdown */
  setPeriodPickerOpen: (open: boolean) => void;
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
    dateRange,
    expandedRows,
    filters,
    goNext,
    goPrev,
    periodPickerOpen,
    selectPeriod,
    setPeriodPickerOpen,
    toggleRow,
    updateFilters,
  };
}
