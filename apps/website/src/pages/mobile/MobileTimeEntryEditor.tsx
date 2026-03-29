import { type ReactElement, useMemo, useState } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import {
  useDeleteTimeEntryMutation,
  useProjectsQuery,
  useTagsQuery,
  useUpdateTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { TrashIcon } from "../../shared/ui/icons.tsx";

type MobileTimeEntryEditorProps = {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onClose: () => void;
};

export function MobileTimeEntryEditor({
  entry,
  onClose,
}: MobileTimeEntryEditorProps): ReactElement {
  const session = useSession();
  const { durationFormat } = useUserPreferences();
  const timezone = session.user.timezone ?? "UTC";
  const workspaceId = entry.workspace_id ?? entry.wid ?? session.currentWorkspace.id;

  const updateMutation = useUpdateTimeEntryMutation();
  const deleteMutation = useDeleteTimeEntryMutation();
  const projectsQuery = useProjectsQuery(workspaceId);
  const tagsQuery = useTagsQuery(workspaceId);

  const [description, setDescription] = useState(entry.description ?? "");
  const [projectId, setProjectId] = useState<number | null>(entry.project_id ?? entry.pid ?? null);
  const [tagIds, setTagIds] = useState<number[]>(entry.tag_ids ?? []);
  const [billable, setBillable] = useState(entry.billable ?? false);
  const [startIso, setStartIso] = useState(entry.start ?? "");
  const [stopIso, setStopIso] = useState(entry.stop ?? "");

  const projects = useMemo(
    () => (Array.isArray(projectsQuery.data) ? projectsQuery.data : []),
    [projectsQuery.data],
  );
  const tags = useMemo(
    () => (Array.isArray(tagsQuery.data) ? tagsQuery.data : []),
    [tagsQuery.data],
  );

  const durationSeconds = useMemo(() => {
    if (!startIso || !stopIso) return 0;
    return Math.max(
      0,
      Math.round((new Date(stopIso).getTime() - new Date(startIso).getTime()) / 1000),
    );
  }, [startIso, stopIso]);

  const duration = formatClockDuration(durationSeconds, durationFormat);

  async function handleSave() {
    if (!entry.id) return;
    await updateMutation.mutateAsync({
      request: {
        billable,
        description: description.trim(),
        projectId,
        start: startIso,
        stop: stopIso,
        tagIds,
      },
      timeEntryId: entry.id,
      workspaceId,
    });
    onClose();
  }

  async function handleDelete() {
    if (!entry.id) return;
    await deleteMutation.mutateAsync({ timeEntryId: entry.id, workspaceId });
    onClose();
  }

  const selectedTagNames = useMemo(
    () =>
      tagIds
        .map((id) => tags.find((t) => t.id === id)?.name)
        .filter(Boolean)
        .join(", "),
    [tagIds, tags],
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--track-surface)] text-[var(--track-text)]">
      {/* Header */}
      <div className="flex h-[52px] items-center justify-between border-b border-[var(--track-border)] px-4">
        <button
          className="text-[14px] text-[var(--track-text-muted)]"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <span className="text-[14px] font-semibold text-white">Edit Entry</span>
        <button
          className="text-[14px] font-semibold text-[var(--track-accent)]"
          disabled={updateMutation.isPending}
          onClick={() => void handleSave()}
          type="button"
        >
          {updateMutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Description */}
        <div className="border-b border-[var(--track-border)] px-4 py-3">
          <input
            autoFocus
            className="w-full bg-transparent text-[15px] text-white placeholder-[var(--track-text-muted)] outline-none"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you working on?"
            value={description}
          />
        </div>

        {/* Project */}
        <FieldRow label="Project">
          <select
            className="min-w-0 flex-1 appearance-none bg-transparent text-right text-[14px] text-white outline-none"
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
            value={projectId ?? ""}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </FieldRow>

        {/* Tags */}
        <FieldRow label="Tags">
          <details className="min-w-0 flex-1">
            <summary className="cursor-pointer list-none text-right text-[14px] text-white">
              {selectedTagNames || "No tags"}
            </summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags
                .filter((tag): tag is typeof tag & { id: number } => typeof tag.id === "number")
                .map((tag) => {
                  const active = tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      className={`rounded-full border px-3 py-1 text-[12px] transition ${
                        active
                          ? "border-[var(--track-accent)] bg-[var(--track-accent)]/15 text-[var(--track-accent)]"
                          : "border-[var(--track-border)] text-[var(--track-text-muted)]"
                      }`}
                      onClick={() =>
                        setTagIds((prev) =>
                          active ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                        )
                      }
                      type="button"
                    >
                      {tag.name}
                    </button>
                  );
                })}
            </div>
          </details>
        </FieldRow>

        {/* Billable */}
        <FieldRow label="Billable">
          <button
            className={`size-5 rounded border transition ${
              billable
                ? "border-[var(--track-accent)] bg-[var(--track-accent)]"
                : "border-[var(--track-border)]"
            }`}
            onClick={() => setBillable((v) => !v)}
            type="button"
          >
            {billable ? (
              <svg
                className="size-5 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M5 10l3 3 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            ) : null}
          </button>
        </FieldRow>

        {/* Time range */}
        <div className="border-b border-[var(--track-border)] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--track-text-muted)]">Start</span>
            <input
              className="bg-transparent text-right text-[14px] tabular-nums text-white outline-none"
              onChange={(e) => {
                const parsed = parseTimeInput(e.target.value, startIso, timezone);
                if (parsed) setStartIso(parsed);
              }}
              type="time"
              value={toTimeInputValue(startIso, timezone)}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[13px] text-[var(--track-text-muted)]">End</span>
            <input
              className="bg-transparent text-right text-[14px] tabular-nums text-white outline-none"
              onChange={(e) => {
                const parsed = parseTimeInput(e.target.value, stopIso, timezone);
                if (parsed) setStopIso(parsed);
              }}
              type="time"
              value={toTimeInputValue(stopIso, timezone)}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[13px] text-[var(--track-text-muted)]">Duration</span>
            <span className="text-[14px] tabular-nums text-white">{duration}</span>
          </div>
        </div>

        {/* Delete */}
        <div className="px-4 py-4">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--track-danger-border-muted)] py-2.5 text-[14px] text-[var(--track-danger-text)] transition hover:bg-[var(--track-danger-surface-muted)]"
            disabled={deleteMutation.isPending}
            onClick={() => void handleDelete()}
            type="button"
          >
            <TrashIcon className="size-4" />
            {deleteMutation.isPending ? "Deleting…" : "Delete entry"}
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

function toTimeInputValue(iso: string, timezone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const h = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(date);
  const m = new Intl.DateTimeFormat("en-US", { minute: "2-digit", timeZone: timezone }).format(
    date,
  );
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function parseTimeInput(timeValue: string, currentIso: string, timezone: string): string | null {
  if (!timeValue || !currentIso) return null;
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const current = new Date(currentIso);
  // Build a new date preserving the date portion, adjusting time
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(current);
  const utcDate = new Date(
    `${parts}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
  );
  // Adjust for timezone offset
  const offset = getTimezoneOffsetMs(utcDate, timezone);
  return new Date(utcDate.getTime() - offset).toISOString();
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: timezone });
  return new Date(tzStr).getTime() - new Date(utcStr).getTime();
}
