import { type ReactElement, useRef, useState } from "react";
import { Check, ChevronLeft, X } from "lucide-react";
import { AppInput } from "@opentickly/web-ui";
import { useTranslation } from "react-i18next";

import { SearchIcon } from "../../shared/ui/icons.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";
import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";

type TagItem = { id: number; name: string };

type GoalTrackPickerProps = {
  billable: boolean;
  disabled: boolean;
  onBillableChange: (billable: boolean) => void;
  onProjectIdsChange: (ids: number[]) => void;
  onTagIdsChange: (ids: number[]) => void;
  projectIds: number[];
  projects: GithubComTogglTogglApiInternalModelsProject[];
  tagIds: number[];
  tags: TagItem[];
};

type PickerView = "menu" | "projects" | "tags" | null;

export function GoalTrackPicker({
  billable,
  disabled,
  onBillableChange,
  onProjectIdsChange,
  onTagIdsChange,
  projectIds,
  projects,
  tagIds,
  tags,
}: GoalTrackPickerProps): ReactElement {
  const { t } = useTranslation("goals");
  const [view, setView] = useState<PickerView>(null);
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const handleDismiss = () => {
    setView(null);
    setSearch("");
  };
  useDismiss(pickerRef, view != null, handleDismiss);

  const selectedProjects = projects.filter((p) => p.id != null && projectIds.includes(p.id));
  const selectedTags = tags.filter((t) => tagIds.includes(t.id));

  const hasSelections = selectedProjects.length > 0 || selectedTags.length > 0 || billable;

  function handleOpenMenu() {
    if (disabled) return;
    setView("menu");
    setSearch("");
  }

  function handleClose() {
    setView(null);
    setSearch("");
  }

  function toggleProject(id: number) {
    if (projectIds.includes(id)) {
      onProjectIdsChange(projectIds.filter((pid) => pid !== id));
    } else {
      onProjectIdsChange([...projectIds, id]);
    }
  }

  function toggleTag(id: number) {
    if (tagIds.includes(id)) {
      onTagIdsChange(tagIds.filter((tid) => tid !== id));
    } else {
      onTagIdsChange([...tagIds, id]);
    }
  }

  function removeProject(id: number) {
    onProjectIdsChange(projectIds.filter((pid) => pid !== id));
  }

  function removeTag(id: number) {
    onTagIdsChange(tagIds.filter((tid) => tid !== id));
  }

  return (
    <div className="relative">
      <button
        className="flex h-[42px] w-full items-center gap-2 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-[var(--track-text-muted)] disabled:opacity-60"
        data-testid="goal-track-button"
        disabled={disabled}
        onClick={handleOpenMenu}
        type="button"
      >
        <SearchIcon className="size-3.5" />
        <span>{t("searchForProjectsTasksBillable")}</span>
      </button>

      {hasSelections ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedProjects.map((p) => (
            <TrackChip
              color={p.color}
              disabled={disabled}
              key={`p-${p.id}`}
              label={p.name ?? ""}
              onRemove={() => removeProject(p.id!)}
            />
          ))}
          {selectedTags.map((t) => (
            <TrackChip
              disabled={disabled}
              key={`t-${t.id}`}
              label={`# ${t.name}`}
              onRemove={() => removeTag(t.id)}
            />
          ))}
          {billable ? (
            <TrackChip
              disabled={disabled}
              label="$ Billable"
              onRemove={() => onBillableChange(false)}
            />
          ) : null}
        </div>
      ) : null}

      {view != null ? (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-tooltip-surface)] shadow-lg"
          ref={pickerRef}
        >
          {view === "menu" ? (
            <TrackMenu
              onSelectBillable={() => {
                onBillableChange(!billable);
                handleClose();
              }}
              onSelectProjects={() => {
                setView("projects");
                setSearch("");
              }}
              onSelectTags={() => {
                setView("tags");
                setSearch("");
              }}
            />
          ) : null}
          {view === "projects" ? (
            <ProjectList
              onBack={() => setView("menu")}
              onSearch={setSearch}
              onToggle={toggleProject}
              projects={projects}
              search={search}
              selectedIds={projectIds}
            />
          ) : null}
          {view === "tags" ? (
            <TagList
              onBack={() => setView("menu")}
              onSearch={setSearch}
              onToggle={toggleTag}
              search={search}
              selectedIds={tagIds}
              tags={tags}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TrackMenu({
  onSelectBillable,
  onSelectProjects,
  onSelectTags,
}: {
  onSelectBillable: () => void;
  onSelectProjects: () => void;
  onSelectTags: () => void;
}): ReactElement {
  const { t } = useTranslation("goals");
  return (
    <div className="p-3">
      <p className="mb-2 text-[12px] leading-4 text-[var(--track-text-muted)]">
        You can just start writing to find projects, tasks, tags or billable label or select any of
        these
      </p>
      <button
        className="flex w-full items-center justify-between rounded-[6px] px-2 py-2 text-[12px] text-white hover:bg-[var(--track-row-hover)]"
        onClick={onSelectProjects}
        type="button"
      >
        <span>{t("selectProject")}</span>
        <span className="flex size-5 items-center justify-center rounded border border-[var(--track-border)] text-[11px] text-[var(--track-text-muted)]">
          @
        </span>
      </button>
      <button
        className="flex w-full items-center justify-between rounded-[6px] px-2 py-2 text-[12px] text-white hover:bg-[var(--track-row-hover)]"
        onClick={onSelectTags}
        type="button"
      >
        <span>{t("selectTags")}</span>
        <span className="flex size-5 items-center justify-center rounded border border-[var(--track-border)] text-[11px] text-[var(--track-text-muted)]">
          #
        </span>
      </button>
      <button
        className="flex w-full items-center justify-between rounded-[6px] px-2 py-2 text-[12px] text-white hover:bg-[var(--track-row-hover)]"
        onClick={onSelectBillable}
        type="button"
      >
        <span>{t("billableHours")}</span>
        <span className="flex size-5 items-center justify-center rounded border border-[var(--track-border)] text-[11px] text-[var(--track-text-muted)]">
          $
        </span>
      </button>
    </div>
  );
}

function ProjectList({
  onBack,
  onSearch,
  onToggle,
  projects,
  search,
  selectedIds,
}: {
  onBack: () => void;
  onSearch: (v: string) => void;
  onToggle: (id: number) => void;
  projects: GithubComTogglTogglApiInternalModelsProject[];
  search: string;
  selectedIds: number[];
}): ReactElement {
  const { t } = useTranslation("goals");
  const filtered = (() => {
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.active !== false &&
        ((p.name ?? "").toLowerCase().includes(q) ||
          (p.client_name ?? "").toLowerCase().includes(q)),
    );
  })();

  const grouped = (() => {
    const map = new Map<string, GithubComTogglTogglApiInternalModelsProject[]>();
    for (const p of filtered) {
      const client = p.client_name ?? "No Client";
      const list = map.get(client) ?? [];
      list.push(p);
      map.set(client, list);
    }
    return map;
  })();

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-[var(--track-border)] px-3 py-2">
        <button
          className="text-[var(--track-text-muted)] hover:text-white"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" size={14} strokeWidth={2} />
        </button>
        <AppInput
          autoFocus
          className="flex-1"
          leadingIcon={<SearchIcon className="size-3.5" />}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("searchByProjectOrClient")}
          size="sm"
          value={search}
        />
      </div>
      <div className="max-h-[240px] overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-[var(--track-text-muted)]">
            {t("noProjectsFound")}
          </div>
        ) : (
          Array.from(grouped.entries()).map(([client, list]) => (
            <div key={client}>
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                {client}
              </div>
              {list.map((p) => {
                const selected = p.id != null && selectedIds.includes(p.id);
                return (
                  <button
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--track-row-hover)] ${
                      selected ? "text-white" : "text-[var(--track-text-muted)]"
                    }`}
                    key={p.id}
                    onClick={() => p.id != null && onToggle(p.id)}
                    type="button"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color ?? "var(--track-text-muted)" }}
                    />
                    <span className="flex-1 truncate">{p.name}</span>
                    {selected ? <CheckIcon /> : null}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TagList({
  onBack,
  onSearch,
  onToggle,
  search,
  selectedIds,
  tags,
}: {
  onBack: () => void;
  onSearch: (v: string) => void;
  onToggle: (id: number) => void;
  search: string;
  selectedIds: number[];
  tags: TagItem[];
}): ReactElement {
  const { t } = useTranslation("goals");
  const filtered = (() => {
    const q = search.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  })();

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-[var(--track-border)] px-3 py-2">
        <button
          className="text-[var(--track-text-muted)] hover:text-white"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" size={14} strokeWidth={2} />
        </button>
        <AppInput
          autoFocus
          className="flex-1"
          leadingIcon={<SearchIcon className="size-3.5" />}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("searchTags")}
          size="sm"
          value={search}
        />
      </div>
      <div className="max-h-[240px] overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-[var(--track-text-muted)]">
            {t("noTagsFound")}
          </div>
        ) : (
          filtered.map((t) => {
            const selected = selectedIds.includes(t.id);
            return (
              <button
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--track-row-hover)] ${
                  selected ? "text-white" : "text-[var(--track-text-muted)]"
                }`}
                key={t.id}
                onClick={() => onToggle(t.id)}
                type="button"
              >
                <span className="flex-1 truncate">{t.name}</span>
                {selected ? <CheckIcon /> : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function TrackChip({
  color,
  disabled,
  label,
  onRemove,
}: {
  color?: string;
  disabled: boolean;
  label: string;
  onRemove: () => void;
}): ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--track-surface-muted)] px-2.5 py-1 text-[12px] text-white">
      {color ? (
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      ) : null}
      <span className="truncate">{label}</span>
      {!disabled ? (
        <button
          className="ml-0.5 text-[var(--track-text-muted)] hover:text-white"
          onClick={onRemove}
          type="button"
        >
          <X aria-hidden="true" className="size-3" size={12} strokeWidth={2} />
        </button>
      ) : null}
    </span>
  );
}

function CheckIcon(): ReactElement {
  return (
    <Check
      aria-hidden="true"
      className="size-3.5 shrink-0 text-[var(--track-accent)]"
      size={14}
      strokeWidth={2.5}
    />
  );
}
