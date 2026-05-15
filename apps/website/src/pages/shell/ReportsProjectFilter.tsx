import { type ChangeEvent, type ReactElement, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppCheckbox, AppInput } from "@opentickly/web-ui";

import { SearchIcon } from "../../shared/ui/icons.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";

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
  const dropdownId = useId();

  const close = () => {
    setOpen(false);
    setSearch("");
  };
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
        aria-controls={open ? dropdownId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex h-10 items-center gap-1.5 rounded-[8px] border-2 px-3 text-[12px] font-semibold shadow-[var(--track-depth-shadow-rest)] transition-all duration-[var(--duration-press)] hover:-translate-y-px hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-0.5 active:shadow-[var(--track-depth-shadow-active)] ${
          activeCount > 0
            ? "border-[var(--track-accent)] bg-[var(--track-accent)]/10 text-[var(--track-accent-text)]"
            : "border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)] hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:text-white"
        }`}
        data-testid="reports-filter-project"
        onClick={() => setOpen(!open)}
        style={{ transitionTimingFunction: "var(--ease-press)" }}
        type="button"
      >
        {buttonLabel}
      </button>
      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[260px] rounded-[8px] border-2 border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] p-2 shadow-[0_14px_32px_var(--track-shadow-overlay)]"
          id={dropdownId}
        >
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
                <button
                  className="mb-1 w-full rounded-[6px] px-2 py-1.5 text-left text-[12px] font-medium text-[var(--track-accent-text)] transition hover:bg-white/4 disabled:cursor-not-allowed disabled:text-[var(--track-text-disabled)] disabled:hover:bg-transparent"
                  disabled={activeCount === 0}
                  onClick={onClear}
                  type="button"
                >
                  {t("clearAll")}
                </button>
                {filtered.map((project) => (
                  <label
                    className="flex cursor-pointer items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-[12px] text-white transition hover:bg-white/4"
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
