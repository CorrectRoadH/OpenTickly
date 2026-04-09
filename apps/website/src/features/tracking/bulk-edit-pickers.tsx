import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import { PickerDropdown } from "../../shared/ui/PickerDropdown.tsx";
import type { TimeEntryEditorProject, TimeEntryEditorTag } from "./TimeEntryEditorDialog.tsx";
import { ChevronRightIcon, PinIcon, ProjectsIcon } from "../../shared/ui/icons.tsx";
import { DEFAULT_PROJECT_COLOR, TRACK_COLOR_SWATCHES } from "../../shared/lib/project-colors.ts";

export type ProjectPickerTask = {
  id: number;
  name: string;
  projectId: number;
};

type ProjectPickerWorkspace = {
  id: number;
  isCurrent?: boolean;
  name: string;
};

export function ProjectPickerDropdown({
  currentWorkspaceId,
  isCreatingProject,
  onCreateProject,
  onSelect,
  onTaskSelect,
  onWorkspaceSelect,
  projects,
  tasks = [],
  workspaceName,
  workspaces,
}: {
  currentWorkspaceId?: number;
  isCreatingProject?: boolean;
  onCreateProject?: (name: string, color: string) => Promise<void> | void;
  onSelect: (id: number | null) => void;
  onTaskSelect?: (projectId: number, taskId: number) => void;
  onWorkspaceSelect?: (workspaceId: number) => void;
  projects: TimeEntryEditorProject[];
  tasks?: ProjectPickerTask[];
  workspaceName: string;
  workspaces?: ProjectPickerWorkspace[];
}): ReactElement {
  const { t } = useTranslation("tracking");
  const [search, setSearch] = useState("");
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState<string>(DEFAULT_PROJECT_COLOR);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);

  const hasWorkspaces = workspaces != null && workspaces.length > 1 && onWorkspaceSelect != null;
  const isSearching = search.trim().length > 0;

  const tasksByProject = (() => {
    const map = new Map<number, ProjectPickerTask[]>();
    for (const task of tasks) {
      const list = map.get(task.projectId) ?? [];
      list.push(task);
      map.set(task.projectId, list);
    }
    return map;
  })();

  const filteredProjects = (() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((p) => {
      const haystack = `${p.name} ${p.clientName ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  })();

  const filteredTasks = (() => {
    const query = search.trim().toLowerCase();
    if (!query) return [] as ProjectPickerTask[];
    return tasks.filter((task) => task.name.toLowerCase().includes(query));
  })();

  return (
    <PickerDropdown
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProjectsIcon className="size-4 shrink-0 text-[var(--track-overlay-icon-muted)]" />
            <span className="truncate text-[12px] font-semibold text-white">{workspaceName}</span>
          </div>
          {hasWorkspaces ? (
            <button
              className="text-[12px] font-medium text-white"
              onClick={() => setWorkspaceMenuOpen((prev) => !prev)}
              type="button"
            >
              {t("change")} ›
            </button>
          ) : null}
        </div>
      }
      search={{
        onChange: setSearch,
        placeholder: t("searchByProjectTaskOrClient"),
        value: search,
      }}
      testId="bulk-edit-project-picker"
      footer={
        onCreateProject != null ? (
          composerOpen ? (
            <ProjectComposerForm
              colorPickerOpen={colorPickerOpen}
              createError={createError}
              draftColor={draftColor}
              draftName={draftName}
              isCreating={isCreatingProject === true}
              onColorChange={setDraftColor}
              onColorPickerToggle={() => setColorPickerOpen((prev) => !prev)}
              onNameChange={(name) => {
                setDraftName(name);
                setCreateError(null);
              }}
              onSubmit={async () => {
                const trimmed = draftName.trim();
                if (!trimmed || isCreatingProject) return;
                setCreateError(null);
                try {
                  await onCreateProject(trimmed, draftColor);
                  setDraftName("");
                  setDraftColor(DEFAULT_PROJECT_COLOR);
                  setColorPickerOpen(false);
                  setComposerOpen(false);
                  setSearch("");
                } catch (err) {
                  const message =
                    err instanceof Error ? err.message : t("projectNameAlreadyExists");
                  setCreateError(
                    message.toLowerCase().includes("name")
                      ? message
                      : t("projectNameAlreadyExists"),
                  );
                }
              }}
            />
          ) : (
            <button
              className="flex items-center gap-3 text-[12px] font-medium text-[var(--track-overlay-text-accent)]"
              onClick={() => {
                setDraftName(search.trim());
                setComposerOpen(true);
              }}
              type="button"
            >
              <span className="text-[18px] leading-none">+</span>
              <span>{t("createNewProject")}</span>
            </button>
          )
        ) : undefined
      }
    >
      {/* Workspace switcher */}
      {hasWorkspaces && workspaceMenuOpen ? (
        <div className="px-4 pb-2">
          <div className="rounded-lg border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface-raised)] py-2 shadow-[0_16px_32px_var(--track-shadow-subtle)]">
            {workspaces.map((workspace) => (
              <button
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[12px] transition hover:bg-white/4 ${
                  workspace.id === currentWorkspaceId
                    ? "text-white"
                    : "text-[var(--track-overlay-text-muted)]"
                }`}
                key={workspace.id}
                onClick={() => {
                  onWorkspaceSelect!(workspace.id);
                  setWorkspaceMenuOpen(false);
                }}
                type="button"
              >
                <span className="truncate">{workspace.name}</span>
                {workspace.id === currentWorkspaceId ? (
                  <span className="text-[11px] text-[var(--track-accent-text)]">
                    {t("current")}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* No Project option */}
      <button
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/4"
        onClick={() => onSelect(null)}
        type="button"
      >
        <span className="flex size-2.5 shrink-0 items-center justify-center">
          <ProjectsIcon className="size-4 text-[var(--track-overlay-icon-muted)]" />
        </span>
        <span className="text-[12px] font-medium text-[var(--track-overlay-text)]">
          {t("noProject")}
        </span>
      </button>

      {/* Search: flat task results */}
      {isSearching && filteredTasks.length > 0
        ? filteredTasks.map((task) => {
            const project = projects.find((p) => p.id === task.projectId);
            return (
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/4"
                key={`task-${task.id}`}
                onClick={() => onTaskSelect?.(task.projectId, task.id)}
                type="button"
              >
                <ProjectsIcon
                  className="size-3.5 shrink-0"
                  style={{ color: project?.color ?? "var(--track-text-muted)" }}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[12px] font-medium"
                    style={{ color: project?.color ?? "white" }}
                  >
                    {project?.name ?? ""} | {task.name}
                  </div>
                </div>
              </button>
            );
          })
        : null}

      {/* Project list */}
      {filteredProjects.map((project) => {
        const projectTasks = tasksByProject.get(project.id) ?? [];
        const hasTasks = projectTasks.length > 0 && onTaskSelect != null;
        const isExpanded = expandedProjectId === project.id;

        return (
          <div key={project.id}>
            <div className="flex w-full items-center gap-0">
              <button
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/4"
                onClick={() => onSelect(project.id)}
                type="button"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-white">{project.name}</div>
                  {project.clientName ? (
                    <div className="truncate text-[11px] text-[var(--track-control-placeholder-muted)]">
                      {project.clientName}
                    </div>
                  ) : null}
                </div>
                {project.pinned ? (
                  <span
                    data-testid="pin-icon"
                    className="flex shrink-0 items-center text-[var(--track-text-muted)]"
                  >
                    <PinIcon className="size-3.5" />
                  </span>
                ) : null}
              </button>
              {hasTasks ? (
                <button
                  aria-label={isExpanded ? "Collapse tasks" : "Expand tasks"}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-white/4 hover:text-white"
                  onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                  type="button"
                >
                  <ChevronRightIcon
                    className={`size-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>
              ) : null}
            </div>
            {hasTasks && isExpanded ? (
              <div className="pl-6">
                {projectTasks.map((task) => (
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/4"
                    key={task.id}
                    onClick={() => onTaskSelect!(project.id, task.id)}
                    type="button"
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate text-[12px] font-medium text-[var(--track-overlay-text)]">
                      {task.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </PickerDropdown>
  );
}

function ProjectComposerForm({
  colorPickerOpen,
  createError,
  draftColor,
  draftName,
  isCreating,
  onColorChange,
  onColorPickerToggle,
  onNameChange,
  onSubmit,
}: {
  colorPickerOpen: boolean;
  createError: string | null;
  draftColor: string;
  draftName: string;
  isCreating: boolean;
  onColorChange: (color: string) => void;
  onColorPickerToggle: () => void;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
}): ReactElement {
  const { t } = useTranslation("tracking");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            aria-label={t("selectProjectColor")}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--track-control-border)] bg-[var(--track-control-surface)]"
            onClick={onColorPickerToggle}
            type="button"
          >
            <span
              className="size-4 rounded-full border border-black/20"
              style={{ backgroundColor: draftColor }}
            />
          </button>
          {colorPickerOpen ? (
            <div className="absolute bottom-[calc(100%+6px)] left-0 z-10 grid w-[200px] grid-cols-5 gap-2 rounded-lg border border-[var(--track-overlay-border-strong)] bg-[var(--track-overlay-surface)] p-3 shadow-[0_12px_28px_var(--track-shadow-overlay)]">
              {TRACK_COLOR_SWATCHES.map((option) => (
                <button
                  aria-label={`Select color ${option}`}
                  className={`flex size-8 items-center justify-center rounded-full border transition ${
                    draftColor === option
                      ? "border-white/80 bg-white/8"
                      : "border-transparent hover:border-white/25"
                  }`}
                  key={option}
                  onClick={() => onColorChange(option)}
                  type="button"
                >
                  <span
                    className="size-4 rounded-full border border-black/20"
                    style={{ backgroundColor: option }}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <input
          className={`h-9 flex-1 rounded-lg border bg-[var(--track-control-surface)] px-3 text-[12px] text-white outline-none placeholder:text-[var(--track-control-placeholder)] ${
            createError ? "border-rose-400" : "border-[var(--track-control-border)]"
          }`}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t("projectNamePlaceholder")}
          value={draftName}
        />
        <button
          className="rounded-lg bg-[var(--track-accent-fill-hover)] px-3 py-2 text-[11px] font-semibold text-[var(--track-button-text)] disabled:opacity-60"
          disabled={isCreating || draftName.trim().length === 0}
          type="submit"
        >
          {isCreating ? t("creating") : t("save")}
        </button>
      </div>
      {createError ? <p className="mt-1.5 text-[12px] text-rose-400">{createError}</p> : null}
    </form>
  );
}

export function TagPickerDropdown({
  filteredTags,
  onSearch,
  onToggle,
  search,
  selectedTagIds,
}: {
  filteredTags: TimeEntryEditorTag[];
  onSearch: (value: string) => void;
  onToggle: (id: number) => void;
  search: string;
  selectedTagIds: Set<number>;
}): ReactElement {
  const { t } = useTranslation("tracking");
  return (
    <PickerDropdown
      search={{ onChange: onSearch, placeholder: t("addFilterTags"), value: search }}
      testId="bulk-edit-tag-picker"
    >
      {filteredTags.map((tag) => {
        const checked = selectedTagIds.has(tag.id);
        return (
          <button
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[12px] transition ${
              checked
                ? "bg-[var(--track-accent-soft)] text-white"
                : "text-[var(--track-overlay-text)] hover:bg-white/4"
            }`}
            key={tag.id}
            onClick={() => onToggle(tag.id)}
            type="button"
          >
            <input
              checked={checked}
              className="size-3.5 cursor-pointer accent-[var(--track-accent)]"
              onChange={() => onToggle(tag.id)}
              type="checkbox"
            />
            <span className="truncate">{tag.name}</span>
          </button>
        );
      })}
    </PickerDropdown>
  );
}
