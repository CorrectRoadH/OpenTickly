import { type ChangeEvent, type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { DollarIcon, TagsIcon } from "../../shared/ui/icons.tsx";
import { useEditorContext } from "./TimeEntryEditorContext.tsx";
import type { TimeEntryEditorProject, TimeEntryEditorTag } from "./time-entry-editor-types.ts";
import type { DescriptionMode } from "./time-entry-editor-utils.ts";
import { buildSuggestionKey } from "./time-entry-editor-utils.ts";

export function EditorDescriptionField({
  descriptionMode,
  filteredProjects,
  filteredTags,
  suggestionEntries,
}: {
  descriptionMode: DescriptionMode;
  filteredProjects: TimeEntryEditorProject[];
  filteredTags: TimeEntryEditorTag[];
  suggestionEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
}): ReactElement {
  const { t } = useTranslation("tracking");
  const ctx = useEditorContext();
  const {
    currentWorkspaceName,
    description,
    dispatch,
    isSaving,
    onBillableToggle,
    onDescriptionChange,
    onProjectSelect,
    onSave,
    onSuggestionEntrySelect,
    onTagToggle,
    ui: { descriptionSuggestionsOpen, picker, timeEditor, timePicker },
  } = ctx;

  return (
    <div className="mt-5">
      <div
        className="absolute right-5 top-[72px] z-0 h-0 w-[140px]"
        data-testid={timeEditor != null ? "time-entry-editor-active-time-edit" : undefined}
      />
      <label className="block">
        <span className="sr-only">Time entry description</span>
        <input
          aria-label={t("addDescriptionPlaceholder")}
          className="w-full bg-transparent text-[14px] font-semibold tracking-tight text-white outline-none placeholder:text-[var(--track-control-placeholder-muted)]"
          id="time-entry-editor-title"
          onBlur={() => {
            window.setTimeout(
              () => dispatch({ type: "SET_DESCRIPTION_SUGGESTIONS", open: false }),
              120,
            );
          }}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onDescriptionChange(event.target.value)
          }
          onFocus={() => dispatch({ type: "SET_DESCRIPTION_SUGGESTIONS", open: true })}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !isSaving &&
              !picker &&
              !timeEditor &&
              timePicker == null &&
              !descriptionSuggestionsOpen
            ) {
              event.preventDefault();
              void onSave();
            }
          }}
          placeholder={t("addDescriptionPlaceholder")}
          value={description}
        />
      </label>
      {descriptionSuggestionsOpen &&
      descriptionMode !== "default" &&
      !timeEditor &&
      timePicker == null ? (
        <DescriptionSuggestionsSurface
          currentWorkspaceName={currentWorkspaceName}
          entryDescription={description}
          entryMode={descriptionMode}
          onBillableToggle={() => {
            onBillableToggle?.();
            if (descriptionMode === "billable") {
              onDescriptionChange("");
            }
            dispatch({ type: "SET_DESCRIPTION_SUGGESTIONS", open: false });
          }}
          onProjectSelect={(projectId) => {
            onProjectSelect(projectId);
            if (descriptionMode === "project") {
              onDescriptionChange("");
            }
            dispatch({ type: "SET_DESCRIPTION_SUGGESTIONS", open: false });
          }}
          onSuggestionEntrySelect={(suggestion) => {
            onSuggestionEntrySelect?.(suggestion);
            dispatch({ type: "SET_DESCRIPTION_SUGGESTIONS", open: false });
          }}
          onTagSelect={(tagId) => {
            onTagToggle(tagId);
            if (descriptionMode === "tag") {
              onDescriptionChange("");
            }
            dispatch({ type: "SET_DESCRIPTION_SUGGESTIONS", open: false });
          }}
          projects={filteredProjects}
          suggestionEntries={suggestionEntries}
          tags={filteredTags}
        />
      ) : null}
    </div>
  );
}

function DescriptionSuggestionsSurface({
  currentWorkspaceName,
  entryDescription,
  entryMode,
  onBillableToggle,
  onProjectSelect,
  onSuggestionEntrySelect,
  onTagSelect,
  projects,
  suggestionEntries,
  tags,
}: {
  currentWorkspaceName: string;
  entryDescription: string;
  entryMode: "billable" | "default" | "project" | "tag";
  onBillableToggle?: () => void;
  onProjectSelect: (projectId: number) => void;
  onSuggestionEntrySelect: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onTagSelect: (tagId: number) => void;
  projects: TimeEntryEditorProject[];
  suggestionEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  tags: TimeEntryEditorTag[];
}): ReactElement {
  const { t } = useTranslation("tracking");
  return (
    <div className="absolute left-0 top-[calc(100%+12px)] z-20 w-[360px] rounded-[12px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] py-3 shadow-[0_14px_32px_var(--track-shadow-overlay)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 pb-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-white">{currentWorkspaceName}</p>
          <p className="text-[12px] text-[var(--track-control-placeholder-muted)]">{t("change")}</p>
        </div>
      </div>
      {entryMode === "billable" ? (
        <div className="px-4 pt-3">
          <button
            className="flex w-full items-center justify-between rounded-[10px] px-3 py-3 text-left text-[14px] text-white transition hover:bg-white/4"
            onClick={onBillableToggle}
            type="button"
          >
            <span>{t("billableHours")}</span>
            <DollarIcon className="size-4 text-[var(--track-accent-secondary)]" />
          </button>
        </div>
      ) : null}
      {(entryMode === "default" || entryDescription.trim().length === 0) &&
      suggestionEntries.length > 0 ? (
        <div className="px-4 pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--track-overlay-text-soft)]">
            {t("previouslyTrackedTimeEntries")}
          </p>
          <div className="mt-2 space-y-1">
            {suggestionEntries.map((suggestion) => (
              <button
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition hover:bg-white/4"
                key={buildSuggestionKey(suggestion)}
                onClick={() => onSuggestionEntrySelect(suggestion)}
                type="button"
              >
                <span className="truncate text-[14px] font-medium text-white">
                  {suggestion.description?.trim() || suggestion.project_name || t("noDescription")}
                </span>
                <span className="truncate text-[12px] text-[var(--track-control-placeholder-muted)]">
                  {suggestion.project_name || t("noProjectLabel")}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {(entryMode === "default" || entryMode === "project") && projects.length > 0 ? (
        <div className="px-4 pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--track-overlay-text-soft)]">
            {t("project")}s
          </p>
          <div className="mt-2 space-y-1">
            {projects.map((project) => (
              <button
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition hover:bg-white/4"
                key={project.id}
                onClick={() => onProjectSelect(project.id)}
                type="button"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate text-[14px] font-medium text-white">{project.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {entryMode === "tag" ? (
        <div className="px-4 pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--track-overlay-text-soft)]">
            {t("tags")}
          </p>
          <div className="mt-2 space-y-1">
            {tags.map((tag) => (
              <button
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition hover:bg-white/4"
                key={tag.id}
                onClick={() => onTagSelect(tag.id)}
                type="button"
              >
                <TagsIcon className="size-4 shrink-0 text-[var(--track-accent-secondary)]" />
                <span className="truncate text-[14px] font-medium text-white">{tag.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
