import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { ProjectPickerDropdown } from "./bulk-edit-pickers.tsx";
import { DollarIcon, ProjectsIcon } from "../../shared/ui/icons.tsx";
import { TagPickerDropdown, TagPickerTrigger } from "./TagPickerDropdown.tsx";
import { useEditorContext } from "./TimeEntryEditorContext.tsx";
import { colorToChipBackground } from "./time-entry-editor-utils.ts";

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
    ui: { picker, search },
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
        <TagPickerTrigger
          active={picker === "tag"}
          onClick={() => {
            dispatch({ type: "SET_SEARCH", query: "" });
            dispatch({ type: "SET_PICKER", picker: picker === "tag" ? null : "tag" });
          }}
          selectedTags={selectedTags}
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
        <div className="absolute -left-2 top-8 z-10 w-[220px]">
          <TagPickerDropdown
            createLabel={() => t("createNewTag")}
            isCreatingTag={isCreatingTag}
            onCreateTag={async (name) => {
              await onCreateTag(name);
            }}
            onSearchChange={(query) => dispatch({ type: "SET_SEARCH", query })}
            onTagToggle={onTagToggle}
            search={search}
            selectedTagIds={selectedTagIds}
            tagOptions={filteredTags}
          />
        </div>
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
