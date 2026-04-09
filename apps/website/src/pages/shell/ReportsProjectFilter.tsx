import { type ChangeEvent, type ReactElement, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppCheckbox, AppInput, useDismiss } from "@opentoggl/web-ui";

import { SearchIcon } from "../../shared/ui/icons.tsx";

export type ReportsProjectOption = {
  clientName?: string;
  color?: string;
  id: number;
  label: string;
};

type ReportsProjectFilterProps = {
  onClear: () => void;
  onToggle: (id: number) => void;
  options: ReportsProjectOption[];
  selected: Set<number>;
};

export function ReportsProjectFilter({
  onClear,
  onToggle,
  options,
  selected,
}: ReportsProjectFilterProps): ReactElement {
  const { t } = useTranslation("reports");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);
  useDismiss(containerRef, open, close);

  const activeCount = selected.size;
  const buttonLabel = activeCount > 0 ? `${t("project")} (${activeCount})` : t("project");

  const query = search.trim().toLowerCase();
  const filtered = query
    ? options.filter((p) => {
        const haystack = `${p.label} ${p.clientName ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
    : options;

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={`flex h-9 items-center gap-1 rounded-[8px] border px-3 text-[12px] font-medium ${
          activeCount > 0
            ? "border-[var(--track-accent)] bg-[var(--track-accent)]/10 text-[var(--track-accent-text)]"
            : "border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[var(--track-text-muted)]"
        }`}
        data-testid="reports-filter-project"
        onClick={() => setOpen(!open)}
        type="button"
      >
        {buttonLabel}
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[260px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-2 shadow-lg">
          <AppInput
            className="mb-2"
            inputClassName="text-[12px]"
            leadingIcon={<SearchIcon className="size-4" />}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder={t("searchProjects")}
            value={search}
          />
          <div className="max-h-[280px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-[12px] text-[var(--track-text-muted)]">
                {t("noProjectsMatchFilters")}
              </p>
            ) : (
              <>
                {activeCount > 0 ? (
                  <button
                    className="mb-1 w-full rounded px-2 py-1.5 text-left text-[12px] font-medium text-[var(--track-accent-text)] hover:bg-[var(--track-surface-muted)]"
                    onClick={onClear}
                    type="button"
                  >
                    {t("clearAll")}
                  </button>
                ) : null}
                {filtered.map((project) => (
                  <label
                    className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-[12px] text-white hover:bg-[var(--track-surface-muted)]"
                    key={project.id}
                  >
                    <AppCheckbox
                      checked={selected.has(project.id)}
                      onChange={() => onToggle(project.id)}
                    />
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: project.color ?? "var(--track-text-muted)",
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate">{project.label}</span>
                    {project.clientName ? (
                      <span className="shrink-0 text-[11px] text-[var(--track-text-muted)]">
                        {project.clientName}
                      </span>
                    ) : null}
                  </label>
                ))}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
