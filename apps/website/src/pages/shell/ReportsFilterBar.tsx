import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { CheckboxFilterDropdown } from "@opentickly/web-ui";
import { useRangePickerClose, WeekRangePicker } from "../../features/tracking/WeekRangePicker.tsx";
import {
  formatTrackQueryDate,
  REPORTS_SHORTCUTS,
  resolveShortcutRange,
} from "../../features/tracking/week-range.ts";
import { SearchIcon } from "../../shared/ui/icons.tsx";
import { ReportsDescriptionFilter } from "./ReportsDescriptionFilter.tsx";
import { ReportsProjectFilter, type ReportsProjectOption } from "./ReportsProjectFilter.tsx";
import type { buildReportsPageModel } from "./reports-page-data.ts";
import type { useReportsPageState } from "./useReportsPageState.ts";

export function ReportsFilterBar({
  clientOptions,
  liveModel,
  memberOptions,
  projectOptions,
  state,
  tagOptions,
  weekStartsOn,
}: {
  clientOptions: string[];
  liveModel: ReturnType<typeof buildReportsPageModel>;
  memberOptions: string[];
  projectOptions: ReportsProjectOption[];
  state: ReturnType<typeof useReportsPageState>;
  tagOptions: { id: number; label: string }[];
  weekStartsOn: number;
}) {
  const { t } = useTranslation("reports");
  const selectedDate = new Date(`${state.dateRange.startDate}T00:00:00`);

  const handleSelectDate = (date: Date) => {
    state.selectDateRange(resolveShortcutRange("this-week", weekStartsOn, date));
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="reports-filter-bar">
      <ReportsRangePicker
        label={liveModel.rangeLabel}
        onSelectDate={handleSelectDate}
        selectedDate={selectedDate}
        state={state}
        weekStartsOn={weekStartsOn}
      />
      <CheckboxFilterDropdown
        clearLabel={t("clearAll")}
        emptyMessage={t("noMembersFound")}
        label={t("member")}
        onClear={() => state.setMemberFilter([])}
        onToggle={(key: string) =>
          state.setMemberFilter(
            state.memberFilter.includes(key)
              ? state.memberFilter.filter((m) => m !== key)
              : [...state.memberFilter, key],
          )
        }
        options={memberOptions.map((m) => ({ key: m, label: m }))}
        searchIcon={<SearchIcon className="size-4" />}
        searchPlaceholder={t("searchMembers")}
        selected={new Set(state.memberFilter)}
        testId="reports-filter-member"
      />
      <CheckboxFilterDropdown
        clearLabel={t("clearAll")}
        emptyMessage={t("noClientsFound")}
        label={t("client")}
        onClear={() => state.setClientFilter([])}
        onToggle={(key: string) =>
          state.setClientFilter(
            state.clientFilter.includes(key)
              ? state.clientFilter.filter((c) => c !== key)
              : [...state.clientFilter, key],
          )
        }
        options={clientOptions.map((c) => ({ key: c, label: c }))}
        searchIcon={<SearchIcon className="size-4" />}
        searchPlaceholder={t("searchClients")}
        selected={new Set(state.clientFilter)}
        testId="reports-filter-client"
      />
      <ReportsProjectFilter
        onClear={() => state.updateFilters({ projectIds: [] })}
        onToggle={(id: number) =>
          state.updateFilters({
            projectIds: state.filters.projectIds.includes(id)
              ? state.filters.projectIds.filter((pid) => pid !== id)
              : [...state.filters.projectIds, id],
          })
        }
        options={projectOptions}
        selected={new Set(state.filters.projectIds)}
      />
      <CheckboxFilterDropdown
        clearLabel={t("clearAll")}
        emptyMessage={t("noTagsFound")}
        label={t("tag")}
        onClear={() => state.updateFilters({ tagIds: [] })}
        onToggle={(key: number) =>
          state.updateFilters({
            tagIds: state.filters.tagIds.includes(key)
              ? state.filters.tagIds.filter((id) => id !== key)
              : [...state.filters.tagIds, key],
          })
        }
        options={tagOptions.map((t) => ({ key: t.id, label: t.label }))}
        searchIcon={<SearchIcon className="size-4" />}
        searchPlaceholder={t("searchTags")}
        selected={new Set(state.filters.tagIds)}
        testId="reports-filter-tag"
      />
      <ReportsDescriptionFilter
        onChange={(value) => state.updateFilters({ description: value })}
        value={state.filters.description}
      />
    </div>
  );
}

function ReportsRangePicker({
  label,
  onSelectDate,
  selectedDate,
  state,
  weekStartsOn,
}: {
  label: string;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  state: ReturnType<typeof useReportsPageState>;
  weekStartsOn: number;
}): ReactElement {
  const rangeStart = new Date(`${state.dateRange.startDate}T00:00:00`);
  const rangeEnd = new Date(`${state.dateRange.endDate}T00:00:00`);

  const handleSelectRange = (start: Date, end: Date) => {
    state.selectDateRange({
      startDate: formatTrackQueryDate(start),
      endDate: formatTrackQueryDate(end),
    });
  };

  return (
    <WeekRangePicker
      label={label}
      mode="range"
      onNext={state.goNext}
      onPrev={state.goPrev}
      onSelectDate={onSelectDate}
      onSelectRange={handleSelectRange}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      selectedDate={selectedDate}
      sidebar={<ReportsDateShortcuts state={state} weekStartsOn={weekStartsOn} />}
      weekStartsOn={weekStartsOn}
    />
  );
}

function ReportsDateShortcuts({
  state,
  weekStartsOn,
}: {
  state: ReturnType<typeof useReportsPageState>;
  weekStartsOn: number;
}): ReactElement {
  const { t } = useTranslation("tracking");
  const close = useRangePickerClose();

  return (
    <>
      {REPORTS_SHORTCUTS.map((shortcut) => {
        const isActive = state.activeShortcut === shortcut.id;

        return (
          <button
            aria-pressed={isActive}
            className={`w-full rounded-[8px] border-2 px-3 py-2 text-left text-[14px] font-semibold shadow-[var(--track-depth-shadow-rest)] transition-all duration-[var(--duration-press)] hover:-translate-y-px hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-0.5 active:shadow-[var(--track-depth-shadow-active)] ${
              isActive
                ? "border-[var(--track-accent-strong)] bg-[var(--track-accent)] text-white"
                : "border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-overlay-text-muted)] hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:text-white"
            }`}
            key={shortcut.id}
            onClick={() => {
              state.selectShortcutRange(
                shortcut.id,
                resolveShortcutRange(shortcut.id, weekStartsOn),
              );
              close();
            }}
            style={{ transitionTimingFunction: "var(--ease-press)" }}
            type="button"
          >
            {t(shortcut.label)}
          </button>
        );
      })}
    </>
  );
}
