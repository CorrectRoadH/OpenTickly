import { type ChangeEvent, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { AppInput } from "@opentickly/web-ui";

import { ProjectPickerDropdown } from "./bulk-edit-pickers.tsx";
import { DollarIcon, ProjectsIcon, SearchIcon, TagsIcon } from "../../shared/ui/icons.tsx";
import { useEditorContext } from "./TimeEntryEditorContext.tsx";
import { colorToChipBackground, resolveTagTriggerLabel } from "./time-entry-editor-utils.ts";

export function EditorPickerBar({
  filteredTags,
}: {
  filteredTags: { id: number; name: string }[];
}): ReactElement {
  const { t } = useTranslation("tracking");
  const ctx = useEditorContext();
  const {
    currentWorkspaceId,
    currentWorkspaceName,
    dispatch,
    entry,
    isCreatingProject,
    isCreatingTag,
    onBillableToggle,
    onCreateProject,
    onCreateTag,
    onProjectSelect,
    onTagToggle,
    onTaskSelect,
    onWorkspaceSelect,
    projects,
    selectedProject,
    selectedTagIds,
    selectedTags,
    selectedTaskName,
    tasks,
    workspaces,
    ui: { picker, search, tagComposerOpen, tagDraftName },
  } = ctx;

  return (
    <div className="relative mt-5" data-picker-area>
      <div className="flex flex-wrap items-center gap-4 text-[var(--track-overlay-text-soft)]">
        <PickerButton
          active={picker === "project"}
          ariaLabel="Select project"
          icon={<ProjectsIcon className="size-5 shrink-0" />}
          label={
            selectedProject
              ? selectedTaskName
                ? `${selectedProject.name} | ${selectedTaskName}`
                : selectedProject.name
              : undefined
          }
          onClick={() => {
            dispatch({ type: "SET_SEARCH", query: "" });
            dispatch({ type: "SET_PICKER", picker: picker === "project" ? null : "project" });
          }}
          toneColor={selectedProject?.color}
          variant={selectedProject ? "project" : "icon"}
        />
        <PickerButton
          active={picker === "tag"}
          ariaLabel="Select tags"
          icon={<TagsIcon className="size-5 shrink-0" />}
          label={resolveTagTriggerLabel(selectedTags)}
          onClick={() => {
            dispatch({ type: "SET_SEARCH", query: "" });
            dispatch({ type: "SET_PICKER", picker: picker === "tag" ? null : "tag" });
          }}
          toneColor="var(--track-accent-secondary)"
          variant={selectedTags.length > 0 ? "tag" : "icon"}
        />
        <PickerButton
          active={entry.billable === true}
          ariaLabel="Billable"
          ariaPressed={entry.billable === true}
          icon={<DollarIcon className="size-5 shrink-0" />}
          onClick={onBillableToggle}
          toneColor="var(--track-accent)"
        />
      </div>

      {picker === "project" ? (
        <div className="absolute -left-2 top-8 z-10 w-[360px]">
          <ProjectPickerDropdown
            currentWorkspaceId={currentWorkspaceId}
            isCreatingProject={isCreatingProject}
            onCreateProject={onCreateProject}
            onSelect={(projectId) => {
              onProjectSelect(projectId);
              dispatch({ type: "SET_PICKER", picker: null });
            }}
            onTaskSelect={
              onTaskSelect
                ? (projectId, taskId) => {
                    onTaskSelect(projectId, taskId);
                    dispatch({ type: "SET_PICKER", picker: null });
                  }
                : undefined
            }
            onWorkspaceSelect={(workspaceId) => {
              onWorkspaceSelect(workspaceId);
              dispatch({ type: "SET_PICKER", picker: null });
            }}
            projects={projects}
            tasks={tasks}
            workspaceName={currentWorkspaceName}
            workspaces={workspaces}
          />
        </div>
      ) : null}

      {picker === "tag" ? (
        <PickerSurface
          icon={<TagsIcon className="size-4 shrink-0 text-[var(--track-overlay-icon-muted)]" />}
          title={t("tags")}
        >
          <SearchField
            placeholder={t("searchTags")}
            value={search}
            onChange={(query: string) => dispatch({ type: "SET_SEARCH", query })}
          />
          <div className="max-h-[340px] overflow-y-auto px-1 py-2">
            {filteredTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);

              return (
                <button
                  className={`flex w-full items-center justify-between rounded-[10px] px-4 py-3 text-left transition ${
                    selected
                      ? "bg-[var(--track-accent-soft)] text-white"
                      : "hover:bg-white/4 text-[var(--track-overlay-text)]"
                  }`}
                  key={tag.id}
                  onClick={() => onTagToggle(tag.id)}
                  type="button"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <TagsIcon className="size-4 shrink-0 text-[var(--track-accent-secondary)]" />
                    <span className="truncate text-[14px]">{tag.name}</span>
                  </div>
                  {selected ? (
                    <span className="text-[12px] text-[var(--track-accent-text)]">
                      {t("selected")}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {tagComposerOpen ? (
            <form
              className="border-t border-white/6 px-4 pb-1 pt-3"
              onSubmit={(event) => {
                void (async () => {
                  event.preventDefault();
                  const trimmed = tagDraftName.trim();
                  if (!trimmed || isCreatingTag) {
                    return;
                  }
                  await onCreateTag(trimmed);
                  dispatch({ type: "SET_TAG_DRAFT_NAME", name: "" });
                  dispatch({ type: "SET_TAG_COMPOSER", open: false });
                  dispatch({ type: "SET_SEARCH", query: "" });
                })();
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  className="h-10 flex-1 rounded-[10px] border border-[var(--track-control-border)] bg-[var(--track-control-surface)] px-3 text-[14px] text-white outline-none placeholder:text-[var(--track-control-placeholder)]"
                  onChange={(event) =>
                    dispatch({ type: "SET_TAG_DRAFT_NAME", name: event.target.value })
                  }
                  placeholder={t("tagName")}
                  value={tagDraftName}
                />
                <button
                  className="rounded-[10px] bg-[var(--track-accent-fill-hover)] px-4 py-2.5 text-[12px] font-semibold text-[var(--track-button-text)] disabled:opacity-60"
                  disabled={isCreatingTag || tagDraftName.trim().length === 0}
                  type="submit"
                >
                  {isCreatingTag ? t("creating") : t("save")}
                </button>
              </div>
            </form>
          ) : (
            <div className="border-t border-white/6 px-4 pb-1 pt-3">
              <button
                className="flex items-center gap-3 text-[14px] font-medium text-[var(--track-overlay-text-accent)]"
                onClick={() => {
                  dispatch({ type: "SET_TAG_DRAFT_NAME", name: search.trim() });
                  dispatch({ type: "SET_TAG_COMPOSER", open: true });
                }}
                type="button"
              >
                <span className="text-[14px] leading-none">+</span>
                <span>{t("createNewTag")}</span>
              </button>
            </div>
          )}
        </PickerSurface>
      ) : null}
    </div>
  );
}

type PickerButtonProps = {
  active?: boolean;
  ariaLabel: string;
  ariaPressed?: boolean;
  icon: ReactElement;
  label?: string;
  onClick?: () => void;
  toneColor?: string;
  variant?: "icon" | "project" | "tag";
};

function PickerButton({
  active = false,
  ariaLabel,
  ariaPressed,
  icon,
  label,
  onClick,
  toneColor,
  variant = "icon",
}: PickerButtonProps): ReactElement {
  const selected = Boolean(label);
  const color = toneColor ?? "var(--track-accent-secondary)";

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={`flex items-center justify-center transition ${
        selected
          ? "h-8 gap-2 rounded-[10px] px-2.5 text-[8px] font-medium"
          : "size-8 rounded-[10px]"
      } ${
        selected
          ? ""
          : active
            ? "bg-white/8"
            : "text-[var(--track-control-placeholder)] hover:bg-white/5 hover:text-white"
      }`}
      onClick={onClick}
      style={
        selected
          ? { backgroundColor: colorToChipBackground(color), color }
          : active && toneColor
            ? { color: toneColor }
            : undefined
      }
      type="button"
    >
      {variant === "project" && label ? (
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        icon
      )}
      {label ? <span className="whitespace-nowrap">{label}</span> : null}
    </button>
  );
}

function PickerSurface({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: ReactElement;
  title: string;
}): ReactElement {
  return (
    <div className="absolute -left-2 top-8 z-10 w-[360px] rounded-[12px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] py-3 shadow-[0_14px_32px_var(--track-shadow-overlay)]">
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon}
          <span className="truncate text-[14px] font-semibold text-white">{title}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function SearchField({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}): ReactElement {
  return (
    <AppInput
      className="mx-4 mb-3"
      inputClassName="text-[14px]"
      leadingIcon={<SearchIcon className="size-4" />}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
  );
}
