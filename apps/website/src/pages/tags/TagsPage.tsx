import { type FormEvent, type ReactElement, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { useCreateTagMutation, useTagsQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

type TagStatusFilter = "active" | "all" | "inactive";

export function TagsPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const tagsQuery = useTagsQuery(workspaceId);
  const createTagMutation = useCreateTagMutation(workspaceId);
  const [tagName, setTagName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TagStatusFilter>("all");
  const [composerOpen, setComposerOpen] = useState(false);

  if (tagsQuery.isPending) {
    return <SurfaceMessage message="Loading tags..." />;
  }

  if (tagsQuery.isError) {
    return <SurfaceMessage message="Unable to load tags. Refresh to try again." tone="error" />;
  }

  const tags = normalizeTags(tagsQuery.data);
  const filteredTags = tags.filter((tag) => {
    if (statusFilter === "active") {
      return !tag.deleted_at;
    }

    if (statusFilter === "inactive") {
      return Boolean(tag.deleted_at);
    }

    return true;
  });
  const activeCount = tags.filter((tag) => !tag.deleted_at).length;
  const inactiveCount = tags.length - activeCount;
  const trimmedTagName = tagName.trim();

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmedTagName.length === 0) {
      return;
    }

    await createTagMutation.mutateAsync(trimmedTagName);
    setTagName("");
    setComposerOpen(false);
    setStatusFilter("all");
    setStatus("Tag created");
  }

  return (
    <div className="w-full min-w-0 bg-[var(--track-surface)] text-white" data-testid="tags-page">
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <h1 className="text-[21px] font-medium text-white">Tags</h1>
          <button
            className="flex h-[28px] items-center gap-1 rounded-md bg-[var(--track-button)] px-3 text-[11px] font-medium text-black"
            data-testid="tags-create-button"
            onClick={() => setComposerOpen((value) => !value)}
            type="button"
          >
            <TrackingIcon className="size-3.5" name="plus" />
            New tag
          </button>
        </div>
        <div
          className="flex min-h-[46px] flex-wrap items-center gap-4 border-t border-[var(--track-border)] px-5 py-2"
          data-testid="tags-filter-bar"
        >
          <label className="relative shrink-0">
            <select
              aria-label="Tag status filter"
              className="h-7 appearance-none rounded-md border border-[var(--track-border)] bg-[#171717] px-3 pr-8 text-[11px] text-white"
              onChange={(event) => setStatusFilter(event.target.value as TagStatusFilter)}
              value={statusFilter}
            >
              <option value="all">All tags</option>
              <option value="active">Active tags</option>
              <option value="inactive">Inactive tags</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--track-text-muted)]">
              <TrackingIcon className="size-3" name="chevron-down" />
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            <span>Filters:</span>
            <FilterChip label="Tag name" />
            <FilterChip label="Status" />
          </div>
          {status ? (
            <span className="ml-auto text-[11px] text-[var(--track-accent-text)]">{status}</span>
          ) : null}
        </div>
      </header>

      {composerOpen ? (
        <form
          className="flex items-center gap-3 border-b border-[var(--track-border)] px-5 py-3"
          data-testid="tags-create-form"
          onSubmit={handleCreateTag}
        >
          <label className="sr-only" htmlFor="tag-name">
            Tag name
          </label>
          <input
            className="h-9 w-[320px] rounded-md border border-[var(--track-border)] bg-[#181818] px-3 text-[13px] text-white outline-none focus:border-[var(--track-accent-soft)]"
            id="tag-name"
            onChange={(event) => setTagName(event.target.value)}
            placeholder="Tag name"
            value={tagName}
          />
          <button
            className="flex h-9 items-center rounded-md bg-[var(--track-button)] px-4 text-[12px] font-medium text-black disabled:opacity-60"
            disabled={trimmedTagName.length === 0 || createTagMutation.isPending}
            type="submit"
          >
            Save tag
          </button>
          <button
            className="flex h-9 items-center rounded-md border border-[var(--track-border)] px-4 text-[12px] text-[var(--track-text-muted)]"
            onClick={() => setComposerOpen(false)}
            type="button"
          >
            Cancel
          </button>
        </form>
      ) : null}

      {filteredTags.length > 0 ? (
        <div data-testid="tags-list">
          <div className="grid grid-cols-[42px_minmax(0,1fr)_120px_98px_42px] border-b border-[var(--track-border)] px-5 text-[9px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            <div className="flex h-[34px] items-center">
              <span className="size-[10px] rounded-[3px] border border-[var(--track-border)]" />
            </div>
            <div className="flex h-[34px] items-center">Tag</div>
            <div className="flex h-[34px] items-center">Workspace</div>
            <div className="flex h-[34px] items-center">Status</div>
            <div className="flex h-[34px] items-center justify-end" />
          </div>
          {filteredTags.map((tag) => (
            <div
              className="grid grid-cols-[42px_minmax(0,1fr)_120px_98px_42px] items-center border-b border-[var(--track-border)] px-5 text-[12px]"
              key={tag.id}
            >
              <div className="flex h-[54px] items-center">
                <span className="size-2 rounded-full bg-[#ff64d2]" />
              </div>
              <div className="flex h-[54px] items-center overflow-hidden">
                <a
                  aria-label={`Tag details for ${tag.name}`}
                  className="truncate text-white"
                  href={`/workspaces/${workspaceId}/tags/${tag.id}`}
                >
                  {tag.name}
                </a>
              </div>
              <div className="flex h-[54px] items-center text-[var(--track-text-muted)]">
                Workspace {tag.workspace_id}
              </div>
              <div className="flex h-[54px] items-center text-white">
                {tag.deleted_at ? "Inactive" : "Active"}
              </div>
              <div className="flex h-[54px] items-center justify-end text-[var(--track-text-muted)]">
                <TrackingIcon className="size-4" name="more" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-10" data-testid="tags-empty-state">
          <p className="text-sm text-[var(--track-text-muted)]">{emptyStateTitle(statusFilter)}</p>
        </div>
      )}

      <div
        className="border-t border-[var(--track-border)] px-5 py-3 text-[11px] text-[var(--track-text-muted)]"
        data-testid="tags-summary"
      >
        Showing {tags.length} tags in workspace {workspaceId}. Active: {activeCount} · Inactive:{" "}
        {inactiveCount}
      </div>
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="flex h-[26px] items-center rounded-md border border-[var(--track-border)] px-2.5 text-[11px] normal-case tracking-normal text-white">
      {label}
    </span>
  );
}

function SurfaceMessage({
  message,
  tone = "muted",
}: {
  message: string;
  tone?: "error" | "muted";
}) {
  return (
    <div
      className={`px-5 py-8 text-sm ${
        tone === "error" ? "text-rose-300" : "text-[var(--track-text-muted)]"
      }`}
    >
      {message}
    </div>
  );
}

function emptyStateTitle(statusFilter: TagStatusFilter): string {
  if (statusFilter === "active") {
    return "No active tags match this view.";
  }

  if (statusFilter === "inactive") {
    return "No inactive tags match this view.";
  }

  return "No tags in this workspace yet.";
}

type TagListItem = {
  deleted_at?: string | null;
  id: number;
  name: string;
  workspace_id?: number | null;
};

function normalizeTags(data: unknown): TagListItem[] {
  if (Array.isArray(data)) {
    return data as TagListItem[];
  }

  if (hasTagArray(data, "tags")) {
    return data.tags;
  }

  if (hasTagArray(data, "data")) {
    return data.data;
  }

  return [];
}

function hasTagArray(
  value: unknown,
  key: "data" | "tags",
): value is Record<typeof key, TagListItem[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}
