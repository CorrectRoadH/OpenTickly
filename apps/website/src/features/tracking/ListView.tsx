import type { ReactElement } from "react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { DropdownMenu, MenuItem, MenuLink, MenuSeparator } from "@opentoggl/web-ui";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { useNowMs } from "../../shared/hooks/useNowMs.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { DollarIcon, MoreIcon, PlayIcon, ProjectsIcon, TagsIcon } from "../../shared/ui/icons.tsx";
import { ProjectPickerDropdown, TagPickerDropdown } from "./bulk-edit-pickers.tsx";
import {
  BulkActionToolbar,
  BulkEditDialog,
  DeleteConfirmDialog,
  useListSelection,
} from "./list-bulk-actions.tsx";
import {
  formatClockDuration,
  formatEntryRange,
  formatGroupLabel,
  resolveEntryColor,
  resolveEntryDurationSeconds,
  type DisplayEntry,
  type EntryGroup,
} from "./overview-data.ts";
import { SurfaceMessage } from "./overview-views.tsx";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";

function isRunningTimeEntry(entry: GithubComTogglTogglApiInternalModelsTimeEntry): boolean {
  return !entry.stop && typeof entry.duration === "number" && entry.duration < 0;
}

export function ListView({
  groups,
  hasMore,
  isLoadingMore,
  onBillableToggle,
  onBulkDelete,
  onBulkEdit,
  onContinueEntry,
  onDeleteEntry,
  onDescriptionChange,
  onDuplicateEntry,
  onEditEntry,
  onFavoriteEntry,
  onLoadMore,
  onProjectChange,
  onSplitEntry,
  onTagsChange,
  projects,
  tags,
  timezone,
  workspaceName,
}: {
  groups: EntryGroup[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onBillableToggle?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onBulkDelete?: (ids: number[]) => void;
  onBulkEdit?: (ids: number[], updates: import("./list-bulk-actions.tsx").BulkEditUpdates) => void;
  onContinueEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDeleteEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDescriptionChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    description: string,
  ) => void;
  onDuplicateEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  onFavoriteEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onLoadMore?: () => void;
  onProjectChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    projectId: number | null,
  ) => void;
  onSplitEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onTagsChange?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, tagIds: number[]) => void;
  projects?: import("./TimeEntryEditorDialog.tsx").TimeEntryEditorProject[];
  tags?: import("./TimeEntryEditorDialog.tsx").TimeEntryEditorTag[];
  timezone: string;
  workspaceName?: string;
}): ReactElement {
  const { t } = useTranslation("tracking");
  const nowMs = useNowMs();
  const { durationFormat, timeofdayFormat } = useUserPreferences();
  const {
    clearSelection,
    isGroupFullySelected,
    isGroupPartiallySelected,
    selectedIds,
    toggleEntry,
    toggleGroup,
  } = useListSelection(groups);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  if (groups.length === 0) {
    return <SurfaceMessage message={t("noTimeEntriesInThisWorkspaceYet")} />;
  }

  return (
    <div data-testid="timer-list-view">
      {selectedIds.size > 0 ? (
        <BulkActionToolbar
          count={selectedIds.size}
          onClear={clearSelection}
          onDelete={() => setDeleteConfirmOpen(true)}
          onEdit={() => setBulkEditOpen(true)}
        />
      ) : null}

      {bulkEditOpen ? (
        <BulkEditDialog
          count={selectedIds.size}
          onClose={() => setBulkEditOpen(false)}
          onSave={(updates) => {
            onBulkEdit?.([...selectedIds], updates);
            setBulkEditOpen(false);
            clearSelection();
          }}
          projects={projects ?? []}
          tags={tags ?? []}
          workspaceName={workspaceName ?? "Workspace"}
        />
      ) : null}

      {deleteConfirmOpen ? (
        <DeleteConfirmDialog
          count={selectedIds.size}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={() => {
            onBulkDelete?.([...selectedIds]);
            setDeleteConfirmOpen(false);
            clearSelection();
          }}
        />
      ) : null}

      {groups.map((group) => {
        const groupChecked = isGroupFullySelected(group);
        const groupIndeterminate = isGroupPartiallySelected(group);
        return (
          <ul
            key={group.key}
            className="grid border-b-[4px] border-[var(--track-border)]"
            style={{
              gridTemplateColumns: "1fr 150px 30px auto auto 40px 30px",
            }}
          >
            {/* Day header row */}
            <li className="col-span-full flex h-[50px] items-center px-5">
              <input
                aria-label={`Select all entries for ${formatGroupLabel(group.key, timezone)}`}
                checked={groupChecked}
                className={`size-[13px] shrink-0 cursor-pointer appearance-none rounded-[3px] border bg-transparent ${
                  groupChecked || groupIndeterminate
                    ? "border-[var(--track-accent)] bg-[var(--track-accent)]"
                    : "border-[var(--track-border)]"
                }`}
                onChange={() => toggleGroup(group)}
                ref={(el) => {
                  if (el) el.indeterminate = groupIndeterminate;
                }}
                type="checkbox"
              />
              <p className="ml-3 flex-1 text-[14px] font-medium text-white">
                {formatGroupLabel(group.key, timezone)}
              </p>
              <p className="text-right text-[14px] font-medium tabular-nums text-white">
                {formatClockDuration(group.totalSeconds, durationFormat)}
              </p>
            </li>

            {/* Entry rows */}
            {group.entries.map((entry) => {
              const displayEntry = entry as DisplayEntry;
              const groupCount = displayEntry._groupCount ?? 0;
              const groupKey = `${group.key}-${entry.id}-${entry.description}`;
              const isExpanded = expandedGroupKeys.has(groupKey);
              // Toggl: expanded shows parent row (badge + totals) + all child rows.
              // Collapsed shows just the representative row with badge.
              const entriesToRender =
                groupCount > 1 && isExpanded
                  ? [entry, ...(displayEntry._groupEntries ?? [])]
                  : [entry];

              return entriesToRender.map((renderEntry, subIdx) => {
                const entryId = renderEntry.id;
                const isSelected = typeof entryId === "number" && selectedIds.has(entryId);
                const isCollapsedRow = groupCount > 1 && !isExpanded && subIdx === 0;
                const isExpandedGroup = groupCount > 1 && isExpanded;
                return (
                  <li
                    key={`${renderEntry.id ?? "no-id"}-${subIdx}`}
                    className={`group col-span-full grid min-h-[58px] items-center py-1 pr-2 pl-5 text-[14px] text-white transition-colors hover:bg-[var(--track-row-hover)] ${
                      isSelected ? "bg-[var(--track-row-hover)]" : ""
                    } ${isExpandedGroup ? "bg-[var(--track-row-hover)]/50" : ""}`}
                    data-entry-description={renderEntry.description?.trim() || ""}
                    data-entry-id={
                      typeof renderEntry.id === "number" ? String(renderEntry.id) : undefined
                    }
                    data-testid="time-entry-list-row"
                    style={{
                      gridTemplateColumns: "subgrid",
                    }}
                  >
                    {/* Left: checkbox + badge + description + project */}
                    <div className="flex min-w-0 items-center gap-0">
                      <div className="flex w-[30px] shrink-0 items-center justify-center">
                        <input
                          aria-label={`Select ${renderEntry.description?.trim() || "time entry"}`}
                          checked={isSelected}
                          className={`size-[13px] cursor-pointer appearance-none rounded-[3px] border bg-transparent opacity-0 transition group-hover:opacity-100 ${
                            isSelected
                              ? "!opacity-100 border-[var(--track-accent)] bg-[var(--track-accent)]"
                              : "border-[var(--track-border)]"
                          }`}
                          onChange={() => {
                            if (typeof entryId === "number") toggleEntry(entryId);
                          }}
                          type="checkbox"
                        />
                      </div>

                      {isCollapsedRow ? (
                        <button
                          aria-label={`Expand ${groupCount} similar entries`}
                          className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-md border border-[var(--track-border)] text-[11px] font-semibold tabular-nums text-[var(--track-text-muted)] hover:border-[var(--track-text-disabled)] hover:text-white"
                          onClick={() => {
                            setExpandedGroupKeys((prev) => {
                              const next = new Set(prev);
                              next.add(groupKey);
                              return next;
                            });
                          }}
                          type="button"
                        >
                          {groupCount}
                        </button>
                      ) : groupCount > 1 && isExpanded && subIdx === 0 ? (
                        <button
                          aria-label="Collapse similar entries"
                          className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-md border border-[var(--track-accent)] text-[11px] font-semibold tabular-nums text-[var(--track-accent)] hover:bg-[var(--track-accent)]/10"
                          onClick={() => {
                            setExpandedGroupKeys((prev) => {
                              const next = new Set(prev);
                              next.delete(groupKey);
                              return next;
                            });
                          }}
                          type="button"
                        >
                          {groupCount}
                        </button>
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <InlineDescription
                            entry={renderEntry}
                            isRunning={isRunningTimeEntry(renderEntry)}
                            onChange={onDescriptionChange}
                          />
                          <ListRowProjectPicker
                            entry={renderEntry}
                            onProjectChange={onProjectChange}
                            projects={projects ?? []}
                            workspaceName={workspaceName ?? "Workspace"}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="min-w-0 overflow-hidden">
                      <ListRowTagPicker
                        entry={renderEntry}
                        onTagsChange={onTagsChange}
                        tags={tags ?? []}
                      />
                    </div>

                    {/* Billable */}
                    <button
                      aria-label={renderEntry.billable ? "Set as non-billable" : "Set as billable"}
                      className={`flex size-[30px] items-center justify-center rounded transition ${
                        renderEntry.billable
                          ? "text-[var(--track-warning-text)]"
                          : "text-[var(--track-text-muted)] opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={() => onBillableToggle?.(renderEntry)}
                      type="button"
                    >
                      <DollarIcon className="size-4" />
                    </button>

                    {/* Duration */}
                    <button
                      aria-label={`Edit ${renderEntry.description?.trim() || "time entry"}`}
                      className="flex items-center justify-end whitespace-nowrap text-[14px] font-medium tabular-nums"
                      data-testid="time-entry-list-edit-button"
                      onClick={(event) =>
                        onEditEntry?.(renderEntry, event.currentTarget.getBoundingClientRect())
                      }
                      type="button"
                    >
                      <span className="text-[var(--track-text-muted)]">
                        {formatClockDuration(
                          resolveEntryDurationSeconds(renderEntry, nowMs),
                          durationFormat,
                        )}
                      </span>
                    </button>

                    {/* Time range */}
                    <button
                      className="flex items-center justify-end whitespace-nowrap pl-3 text-[14px] font-medium tabular-nums"
                      onClick={(event) =>
                        onEditEntry?.(renderEntry, event.currentTarget.getBoundingClientRect())
                      }
                      type="button"
                    >
                      <span className="text-[var(--track-text-muted)]">
                        {formatEntryRange(renderEntry, timezone, timeofdayFormat)}
                      </span>
                    </button>

                    {/* Continue */}
                    <div className="flex items-center justify-center">
                      <button
                        aria-label={`Continue ${renderEntry.description?.trim() || "time entry"}`}
                        className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] opacity-0 transition hover:text-white group-hover:opacity-100"
                        onClick={() => onContinueEntry?.(renderEntry)}
                        type="button"
                      >
                        <PlayIcon className="size-3" />
                      </button>
                    </div>

                    {/* More actions */}
                    <ListRowMoreActions
                      entry={renderEntry}
                      onBillableToggle={onBillableToggle}
                      onContinue={onContinueEntry}
                      onDelete={onDeleteEntry}
                      onDuplicate={onDuplicateEntry}
                      onFavorite={onFavoriteEntry}
                      onSplit={onSplitEntry}
                    />
                  </li>
                );
              });
            })}
          </ul>
        );
      })}

      {hasMore ? (
        <button
          className="mx-auto my-6 flex h-[38px] items-center justify-center rounded-lg border border-[var(--track-border)] px-6 text-[14px] font-medium text-white transition hover:bg-[var(--track-row-hover)] disabled:opacity-50"
          disabled={isLoadingMore}
          onClick={onLoadMore}
          type="button"
        >
          {isLoadingMore ? t("loading") : t("loadMore")}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Inline description editor — click to edit, blur/Enter to save.
 * Matches Toggl Track's inline textbox behavior.
 */
function InlineDescription({
  entry,
  isRunning,
  onChange,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  isRunning: boolean;
  onChange?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, description: string) => void;
}) {
  const { t } = useTranslation("tracking");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const desc = entry.description?.trim() || "";

  const startEditing = () => {
    setDraft(desc);
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== desc) {
      onChange?.(entry, draft.trim());
    }
  };

  if (editing) {
    return (
      <input
        className="min-w-0 shrink bg-transparent text-[14px] font-medium text-white outline-none"
        onBlur={commit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        ref={inputRef}
        type="text"
        value={draft}
      />
    );
  }

  return (
    <button
      className="flex min-w-0 max-w-full cursor-text items-center gap-2 text-left"
      onClick={startEditing}
      type="button"
    >
      {isRunning ? (
        <span
          className="size-2 shrink-0 rounded-full bg-[var(--track-accent)]"
          style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
        />
      ) : null}
      <p
        className={`truncate text-[14px] font-medium ${desc ? "text-white" : "text-[var(--track-text-muted)]"}`}
      >
        <span data-testid="time-entry-description">{desc || t("addDescription")}</span>
      </p>
    </button>
  );
}

/**
 * Inline tag picker — click tag icon to open dropdown.
 * Always shows the icon (filled when tags exist, muted when empty).
 */
function ListRowTagPicker({
  entry,
  onTagsChange,
  tags,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onTagsChange?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, tagIds: number[]) => void;
  tags: import("./TimeEntryEditorDialog.tsx").TimeEntryEditorTag[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const entryTagIds = entry.tag_ids ?? [];
  const selectedTagIds = useMemo(() => new Set(entryTagIds), [entryTagIds]);
  const hasTags = entryTagIds.length > 0;

  const filteredTags = useMemo(
    () =>
      search.trim()
        ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
        : tags,
    [tags, search],
  );

  const tagNames = useMemo(() => {
    if (!hasTags) return "";
    const tagMap = new Map(tags.map((t) => [t.id, t.name]));
    return entryTagIds.map((id) => tagMap.get(id) ?? `tag-${id}`).join(", ");
  }, [hasTags, entryTagIds, tags]);

  return (
    <div className="relative flex items-center" ref={containerRef}>
      <button
        aria-label="Select tags"
        className={`flex h-[30px] w-full items-center gap-1 overflow-hidden rounded transition ${
          hasTags
            ? "text-[var(--track-text-muted)]"
            : "justify-center text-[var(--track-text-muted)] opacity-0 group-hover:opacity-100"
        }`}
        onClick={() => {
          setOpen((prev) => !prev);
          setSearch("");
        }}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        type="button"
      >
        {hasTags ? (
          <span className="truncate text-[12px]">{tagNames}</span>
        ) : (
          <TagsIcon className="size-3.5" />
        )}
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-[280px]"
          onMouseDown={(e) => e.preventDefault()}
        >
          <TagPickerDropdown
            filteredTags={filteredTags}
            onSearch={setSearch}
            onToggle={(tagId) => {
              const next = selectedTagIds.has(tagId)
                ? entryTagIds.filter((id) => id !== tagId)
                : [...entryTagIds, tagId];
              onTagsChange?.(entry, next);
            }}
            search={search}
            selectedTagIds={selectedTagIds}
          />
        </div>
      ) : null}
    </div>
  );
}

function ListRowMoreActions({
  entry,
  onBillableToggle,
  onContinue: _onContinue,
  onDelete,
  onDuplicate,
  onFavorite,
  onSplit,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onBillableToggle?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onContinue?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDelete?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDuplicate?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onFavorite?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onSplit?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
}) {
  const { t } = useTranslation("tracking");
  const label = entry.description?.trim() || "time entry";

  return (
    <DropdownMenu
      minWidth="200px"
      trigger={
        <button
          aria-label={`More actions for ${label}`}
          className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] opacity-0 transition hover:text-white group-hover:opacity-100"
          type="button"
        >
          <MoreIcon className="size-3" />
        </button>
      }
    >
      <MenuItem onClick={() => onBillableToggle?.(entry)}>
        {entry.billable ? t("setAsNonBillable") : t("setAsBillable")}
      </MenuItem>
      <MenuItem onClick={() => onDuplicate?.(entry)}>{t("duplicate")}</MenuItem>
      {entry.start && entry.stop ? (
        <MenuItem onClick={() => onSplit?.(entry)}>{t("split")}</MenuItem>
      ) : null}
      {entry.project_id || entry.pid ? (
        <MenuLink
          href={`/projects/${entry.workspace_id ?? entry.wid}/edit/${resolveTimeEntryProjectId(entry)}`}
        >
          {t("goToProject")}
        </MenuLink>
      ) : null}
      <MenuItem onClick={() => onFavorite?.(entry)}>{t("pinAsFavorite")}</MenuItem>
      <MenuItem onClick={() => void navigator.clipboard.writeText(entry.description?.trim() ?? "")}>
        {t("copyDescription")}
      </MenuItem>
      <MenuItem
        onClick={() => {
          if (typeof entry.id === "number") {
            const startLink = `${window.location.origin}/timer?entry=${entry.id}`;
            void navigator.clipboard.writeText(startLink);
          }
        }}
      >
        {t("copyStartLink")}
      </MenuItem>
      <MenuSeparator />
      <MenuItem destructive onClick={() => onDelete?.(entry)}>
        {t("delete")}
      </MenuItem>
    </DropdownMenu>
  );
}

/**
 * Project picker — shows project name (clickable to open picker)
 * and a hover-only folder icon when no project is set.
 */
function ListRowProjectPicker({
  entry,
  onProjectChange,
  projects,
  workspaceName,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onProjectChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    projectId: number | null,
  ) => void;
  projects: import("./TimeEntryEditorDialog.tsx").TimeEntryEditorProject[];
  workspaceName: string;
}) {
  const { t } = useTranslation("tracking");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasProject = !!entry.project_name;

  return (
    <div className="relative" ref={containerRef}>
      {hasProject ? (
        <button
          aria-label={`Change project for ${entry.description?.trim() || "time entry"}`}
          className="flex max-w-[260px] cursor-pointer items-center gap-1.5 overflow-hidden rounded-[8px] bg-[var(--track-surface-muted)] px-2.5 py-1 text-[12px] font-medium transition hover:bg-[var(--track-row-hover)]"
          onClick={() => setOpen((prev) => !prev)}
          onBlur={(e) => {
            if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
          }}
          type="button"
        >
          <span
            className="size-[9px] shrink-0 rounded-full"
            style={{ backgroundColor: resolveEntryColor(entry) }}
          />
          <span className="truncate" style={{ color: resolveEntryColor(entry) }}>
            {entry.project_name}
          </span>
          {entry.client_name ? (
            <span className="truncate text-[var(--track-text-muted)]">
              <span className="mx-0.5">·</span>
              <span>{entry.client_name}</span>
            </span>
          ) : null}
        </button>
      ) : (
        <button
          aria-label="Add a project"
          className="flex items-center gap-1.5 rounded-[8px] border border-dashed border-[var(--track-border)] px-2.5 py-1 text-[12px] font-medium text-[var(--track-text-muted)] transition hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:text-white"
          onClick={() => setOpen((prev) => !prev)}
          onBlur={(e) => {
            if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
          }}
          type="button"
        >
          <ProjectsIcon className="size-3.5" />
          <span>{t("addProject")}</span>
        </button>
      )}
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[280px]"
          onMouseDown={(e) => e.preventDefault()}
        >
          <ProjectPickerDropdown
            onSelect={(projectId) => {
              setOpen(false);
              onProjectChange?.(entry, projectId);
            }}
            projects={projects}
            workspaceName={workspaceName}
          />
        </div>
      ) : null}
    </div>
  );
}
