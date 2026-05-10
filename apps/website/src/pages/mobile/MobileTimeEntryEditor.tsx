import { useTranslation } from "react-i18next";
import { type ReactElement, useState } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";
import {
  applyTimeInputValue,
  getTimeZoneParts,
  toTimeInputValue,
} from "../../features/tracking/time-entry-editor-utils.ts";
import { resolveTimeEntryProjectId } from "../../features/tracking/time-entry-ids.ts";
import { normalizeProjects, normalizeTags } from "../../features/tracking/useWorkspaceData.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import {
  useDeleteTimeEntryMutation,
  useProjectsQuery,
  useTasksQuery,
  useTagsQuery,
  useUpdateTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { Check, ChevronRight } from "lucide-react";
import { PinIcon, TrashIcon } from "../../shared/ui/icons.tsx";
import { MobilePickerOverlay } from "./MobilePickerOverlay.tsx";
import { MobileTimePicker } from "./MobileTimePicker.tsx";

type MobileTimeEntryEditorProps = {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onClose: () => void;
};

export function MobileTimeEntryEditor({
  entry,
  onClose,
}: MobileTimeEntryEditorProps): ReactElement {
  const { t } = useTranslation(["mobile", "tracking"]);
  const session = useSession();
  const { durationFormat } = useUserPreferences();
  const timezone = session.user.timezone ?? "UTC";
  const workspaceId = entry.workspace_id ?? entry.wid ?? session.currentWorkspace.id;

  const updateMutation = useUpdateTimeEntryMutation();
  const deleteMutation = useDeleteTimeEntryMutation();
  const projectsQuery = useProjectsQuery(workspaceId);
  const tasksQuery = useTasksQuery(workspaceId);
  const tagsQuery = useTagsQuery(workspaceId);

  const [description, setDescription] = useState(entry.description ?? "");
  const [projectId, setProjectId] = useState<number | null>(resolveTimeEntryProjectId(entry));
  const [taskId, setTaskId] = useState<number | null>(entry.task_id ?? entry.tid ?? null);
  const [tagIds, setTagIds] = useState<number[]>(entry.tag_ids ?? []);
  const [billable, setBillable] = useState(entry.billable ?? false);
  const [startIso, setStartIso] = useState(entry.start ?? "");
  const [stopIso, setStopIso] = useState(entry.stop ?? "");

  // The projects/tags queries may arrive as a plain array OR as a wrapped
  // `{ projects: [...] }` / `{ data: [...] }` envelope — see `normalizeProjects`.
  // Guarding with `Array.isArray` silently drops the wrapped shape, which left
  // `selectedProject` null after picking a project and then sent
  // `projectName: null` to the optimistic patch, so the row stayed blank
  // until the PUT returned. Normalize through the same helpers the list
  // view uses so all call sites share one source of truth.
  const projects = normalizeProjects(projectsQuery.data);
  const tags = normalizeTags(tagsQuery.data);
  const tasks = (tasksQuery.data?.data ?? []).filter(
    (task): task is typeof task & { id: number; name: string; project_id: number } =>
      task.id != null && task.name != null && task.project_id != null && task.active !== false,
  );

  const isRunning = !stopIso;
  const durationSeconds = (() => {
    if (!startIso) return 0;
    const endMs = stopIso ? new Date(stopIso).getTime() : Date.now();
    return Math.round((endMs - new Date(startIso).getTime()) / 1000);
  })();
  const invalidRange = !isRunning && durationSeconds < 0;

  const duration = formatClockDuration(Math.max(0, durationSeconds), durationFormat);

  // Close the modal synchronously and fire the mutation in the background.
  // The mutation's onMutate already patched the cache, so the list/timer
  // reflect the edit instantly; holding the modal open waiting for the
  // server round-trip was the remaining source of "慢一拍" on mobile.
  // On error, the mutation's onError rolls the cache back.
  function handleSave() {
    if (!entry.id) return;
    onClose();
    void updateMutation.mutateAsync({
      request: {
        billable,
        description: description.trim(),
        projectColor: selectedProject?.color ?? null,
        projectId,
        projectName: selectedProject?.name ?? null,
        start: startIso,
        stop: stopIso,
        tagIds,
        taskId,
      },
      timeEntryId: entry.id,
      workspaceId,
    });
  }

  function handleDelete() {
    if (!entry.id) return;
    onClose();
    void deleteMutation.mutateAsync({ timeEntryId: entry.id, workspaceId });
  }

  const selectedProject = projects.find((p) => p.id === projectId) ?? null;
  const selectedTask = tasks.find((task) => task.id === taskId) ?? null;

  const selectedTagNames = tagIds
    .map((id) => tags.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState<"start" | "end" | null>(null);

  const pickerIso = timePickerOpen === "end" ? stopIso : startIso;
  const pickerHM = pickerIso
    ? getTimeZoneParts(new Date(pickerIso), timezone)
    : { hours: 0, minutes: 0 };
  const pickerSetter = timePickerOpen === "end" ? setStopIso : setStartIso;
  const pickerTitle =
    timePickerOpen === "end"
      ? t("editEndTime")
      : timePickerOpen === "start"
        ? t("editStartTime")
        : "";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--track-surface)] pb-[env(safe-area-inset-bottom)] text-[var(--track-text)]"
      data-testid="mobile-time-entry-editor"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Project picker overlay */}
      {projectPickerOpen ? (
        <MobilePickerOverlay
          onClose={() => setProjectPickerOpen(false)}
          searchPlaceholder={t("tracking:searchByProjectTaskOrClient")}
          testId="mobile-project-picker"
          title={t("project")}
        >
          {(search) => {
            const query = search.trim().toLowerCase();
            const active = projects.filter((p) => p.active !== false);
            const filteredTasks = query
              ? tasks.filter((task) => task.name.toLowerCase().includes(query))
              : [];
            const filtered = query
              ? active.filter((p) => {
                  const haystack = `${p.name} ${p.client_name ?? ""}`.toLowerCase();
                  return haystack.includes(query);
                })
              : active;
            return (
              <>
                {/* Hide the "No project" action while searching — it's
                    not a search hit, and leaving it at the top of a
                    filtered list makes the no-match case confusing. */}
                {query ? null : (
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/4"
                    onClick={() => {
                      setProjectId(null);
                      setProjectPickerOpen(false);
                    }}
                    type="button"
                  >
                    <span className="size-2.5 shrink-0 rounded-full bg-[var(--track-text-muted)]" />
                    <span className="text-[14px] text-[var(--track-text-muted)]">
                      {t("noProject")}
                    </span>
                  </button>
                )}
                {query && filtered.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[13px] text-[var(--track-text-muted)]">
                    {t("noMatches", { query: search.trim() })}
                  </p>
                ) : null}
                {filteredTasks.map((task) => {
                  const taskProject = projects.find((project) => project.id === task.project_id);
                  if (!taskProject) return null;
                  return (
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/4"
                      key={`task-${task.id}`}
                      onClick={() => {
                        setProjectId(task.project_id);
                        setTaskId(task.id);
                        setProjectPickerOpen(false);
                      }}
                      type="button"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: taskProject.color ?? "var(--track-text-muted)",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-white">
                          {taskProject.name}
                        </span>
                        <span className="block truncate text-[12px] text-[var(--track-text-muted)]">
                          {task.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {filtered.map((p) => (
                  <button
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/4 ${
                      p.id === projectId ? "bg-white/4" : ""
                    }`}
                    key={p.id}
                    onClick={() => {
                      setProjectId(p.id ?? null);
                      setTaskId(null);
                      setProjectPickerOpen(false);
                    }}
                    type="button"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color ?? "var(--track-text-muted)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-[14px] text-white">{p.name}</span>
                      {p.client_name ? (
                        <span className="ml-2 text-[12px] text-[var(--track-text-muted)]">
                          {p.client_name}
                        </span>
                      ) : null}
                    </div>
                    {p.pinned ? (
                      <span
                        className="flex shrink-0 items-center text-[var(--track-text-muted)]"
                        data-testid="pin-icon"
                      >
                        <PinIcon className="size-3.5" />
                      </span>
                    ) : null}
                    {p.id === projectId ? (
                      <Check className="size-4 shrink-0 text-[var(--track-accent)]" />
                    ) : null}
                  </button>
                ))}
              </>
            );
          }}
        </MobilePickerOverlay>
      ) : null}

      {/* Tag picker overlay */}
      {tagPickerOpen ? (
        <MobilePickerOverlay
          onClose={() => setTagPickerOpen(false)}
          testId="mobile-tag-picker"
          title={t("tags")}
        >
          {(search) => {
            const query = search.trim().toLowerCase();
            const filtered = tags
              .filter((tag): tag is typeof tag & { id: number } => typeof tag.id === "number")
              .filter((tag) => !query || (tag.name ?? "").toLowerCase().includes(query));
            return (
              <>
                {filtered.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[13px] text-[var(--track-text-muted)]">
                    {query ? t("noMatches", { query: search.trim() }) : t("noTagsYet")}
                  </p>
                ) : null}
                {filtered.map((tag) => {
                  const active = tagIds.includes(tag.id);
                  return (
                    <button
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/4 ${
                        active ? "bg-white/4" : ""
                      }`}
                      key={tag.id}
                      onClick={() =>
                        setTagIds((prev) =>
                          active ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                        )
                      }
                      type="button"
                    >
                      <span
                        className={`flex size-5 items-center justify-center rounded border transition ${
                          active
                            ? "border-[var(--track-accent)] bg-[var(--track-accent)]"
                            : "border-[var(--track-border)]"
                        }`}
                      >
                        {active ? (
                          <Check className="size-3.5 text-black" strokeWidth={2.5} />
                        ) : null}
                      </span>
                      <span className="truncate text-[14px] text-white">{tag.name}</span>
                    </button>
                  );
                })}
              </>
            );
          }}
        </MobilePickerOverlay>
      ) : null}

      {/* Time picker sheet */}
      {timePickerOpen ? (
        <MobileTimePicker
          hour={pickerHM.hours}
          minute={pickerHM.minutes}
          onChange={(h, m) => {
            if (!pickerIso) return;
            const hhmm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            const next = applyTimeInputValue(new Date(pickerIso), hhmm, timezone);
            if (next) pickerSetter(next.toISOString());
          }}
          onClose={() => setTimePickerOpen(null)}
          testId="mobile-time-picker"
          title={pickerTitle}
        />
      ) : null}

      {/* Header */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[var(--track-border)] px-2">
        <button
          aria-label={t("cancelEditing")}
          className="flex h-11 items-center rounded-full px-3 text-[14px] text-[var(--track-text-muted)] transition active:bg-white/5"
          onClick={onClose}
          type="button"
        >
          {t("cancel")}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-white">{t("editEntry")}</span>
          {isRunning ? (
            <span className="flex items-center gap-1 rounded-full bg-[var(--track-accent)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--track-accent)]">
              <span className="inline-block size-[6px] animate-pulse rounded-full bg-[var(--track-accent)]" />
              {t("running")}
            </span>
          ) : null}
        </div>
        <button
          aria-label={t("saveChanges")}
          className="flex h-11 items-center rounded-full px-3 text-[14px] font-semibold text-[var(--track-accent)] transition active:bg-white/5 disabled:opacity-60"
          disabled={updateMutation.isPending || invalidRange}
          onClick={() => handleSave()}
          type="button"
        >
          {updateMutation.isPending ? t("saving") : t("save")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Description */}
        <div className="border-b border-[var(--track-border)] px-4 py-3">
          <input
            aria-label={t("timeEntryDescription")}
            className="w-full bg-transparent text-[15px] text-white placeholder-[var(--track-text-muted)] outline-none"
            enterKeyHint="done"
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            placeholder={t("whatAreYouWorkingOn")}
            value={description}
          />
        </div>

        {/* Project */}
        <FieldRow label={t("project")}>
          <button
            className="flex min-w-0 flex-1 items-center justify-end gap-2"
            data-testid="mobile-project-trigger"
            onClick={() => setProjectPickerOpen(true)}
            type="button"
          >
            {selectedProject ? (
              <>
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: selectedProject.color ?? "var(--track-text-muted)" }}
                />
                <span className="min-w-0 truncate text-[14px] text-white">
                  {selectedTask
                    ? `${selectedProject.name} | ${selectedTask.name}`
                    : selectedProject.name}
                </span>
              </>
            ) : (
              <span className="text-[14px] text-[var(--track-text-muted)]">{t("noProject")}</span>
            )}
            <ChevronRight className="size-4 shrink-0 text-[var(--track-text-muted)]" />
          </button>
        </FieldRow>

        {/* Tags */}
        <FieldRow label={t("tags")}>
          <button
            className="flex min-w-0 flex-1 items-center justify-end gap-2"
            data-testid="mobile-tag-trigger"
            onClick={() => setTagPickerOpen(true)}
            type="button"
          >
            <span className="truncate text-[14px] text-white">
              {selectedTagNames || t("noTags")}
            </span>
            <ChevronRight className="size-4 shrink-0 text-[var(--track-text-muted)]" />
          </button>
        </FieldRow>

        {/* Billable */}
        <FieldRow label={t("billable")}>
          <button
            aria-checked={billable}
            aria-label={t("billable")}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              billable ? "bg-[var(--track-accent)]" : "bg-[var(--track-border)]"
            }`}
            onClick={() => setBillable((v) => !v)}
            role="switch"
            type="button"
          >
            <span
              className={`absolute top-[2px] block size-5 rounded-full bg-white shadow transition-transform ${
                billable ? "translate-x-[22px]" : "translate-x-[2px]"
              }`}
            />
          </button>
        </FieldRow>

        {/* Time range */}
        <div className="border-b border-[var(--track-border)] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--track-text-muted)]">{t("start")}</span>
            <button
              aria-label={t("editStartTime")}
              className="bg-transparent text-right text-[14px] tabular-nums text-white outline-none transition active:opacity-70"
              data-testid="mobile-start-time-trigger"
              onClick={() => setTimePickerOpen("start")}
              style={{ fontFamily: "var(--font-mono), monospace" }}
              type="button"
            >
              {startIso ? toTimeInputValue(new Date(startIso), timezone) : "--:--"}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[13px] text-[var(--track-text-muted)]">{t("end")}</span>
            <button
              aria-label={t("editEndTime")}
              className="bg-transparent text-right text-[14px] tabular-nums text-white outline-none transition active:opacity-70 disabled:opacity-50"
              data-testid="mobile-end-time-trigger"
              disabled={isRunning}
              onClick={() => setTimePickerOpen("end")}
              style={{ fontFamily: "var(--font-mono), monospace" }}
              type="button"
            >
              {stopIso ? toTimeInputValue(new Date(stopIso), timezone) : "--:--"}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[13px] text-[var(--track-text-muted)]">{t("duration")}</span>
            <span
              className={`text-[14px] tabular-nums ${
                invalidRange ? "text-[var(--track-danger-text)]" : "text-white"
              }`}
            >
              {duration}
            </span>
          </div>
          {invalidRange ? (
            <p className="mt-2 text-[12px] text-[var(--track-danger-text)]">
              {t("endBeforeStart")}
            </p>
          ) : null}
        </div>

        {/* Delete */}
        <div className="px-4 py-4">
          <button
            aria-label={t("deleteThisTimeEntry")}
            className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--track-danger-border-muted)] py-3 text-[14px] text-[var(--track-danger-text)] transition hover:bg-[var(--track-danger-surface-muted)] active:scale-[0.98] active:bg-[var(--track-danger-surface-muted)]"
            disabled={deleteMutation.isPending}
            onClick={() => handleDelete()}
            type="button"
          >
            <TrashIcon className="size-4" />
            {deleteMutation.isPending ? t("deletingEntry") : t("deleteEntry")}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ children, label }: { children: ReactElement; label: string }): ReactElement {
  return (
    <div className="flex items-center justify-between border-b border-[var(--track-border)] px-4 py-3">
      <span className="text-[13px] text-[var(--track-text-muted)]">{label}</span>
      {children}
    </div>
  );
}
