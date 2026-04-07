import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { ProjectsIcon, TagsIcon } from "../../shared/ui/icons.tsx";
import { ProjectPickerDropdown, TagPickerDropdown } from "./bulk-edit-pickers.tsx";
import type { TimeEntryEditorProject, TimeEntryEditorTag } from "./TimeEntryEditorDialog.tsx";
import { resolveEntryColor } from "./overview-data.ts";

export { ListRowMoreActions } from "./ListRowMoreActions.tsx";

/**
 * Inline description editor — click to edit, blur/Enter to save.
 * Matches Toggl Track's inline textbox behavior.
 */
export function InlineDescription({
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
export function ListRowTagPicker({
  entry,
  onTagsChange,
  tags,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onTagsChange?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, tagIds: number[]) => void;
  tags: TimeEntryEditorTag[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const entryTagIds = entry.tag_ids ?? [];
  const selectedTagIds = new Set(entryTagIds);
  const hasTags = entryTagIds.length > 0;

  const filteredTags = search.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tags;

  const tagNames = (() => {
    if (!hasTags) return "";
    const tagMap = new Map(tags.map((t) => [t.id, t.name]));
    return entryTagIds.map((id) => tagMap.get(id) ?? `tag-${id}`).join(", ");
  })();

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

/**
 * Project picker — shows project name (clickable to open picker)
 * and a hover-only folder icon when no project is set.
 */
export function ListRowProjectPicker({
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
  projects: TimeEntryEditorProject[];
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
