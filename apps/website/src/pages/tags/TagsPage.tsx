import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type FormEvent, type ReactElement, useRef, useState } from "react";

import { useCreateTagMutation, useTagsQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

type TagStatusFilter = "active" | "all" | "inactive";

function emptyStateTitle(statusFilter: TagStatusFilter): string {
  if (statusFilter === "active") {
    return "No active tags match this view.";
  }

  if (statusFilter === "inactive") {
    return "No inactive tags match this view.";
  }

  return "No tags in this workspace yet.";
}

export function TagsPage(): ReactElement {
  const session = useSession();
  const tagsQuery = useTagsQuery(session.currentWorkspace.id);
  const createTagMutation = useCreateTagMutation(session.currentWorkspace.id);
  const [tagName, setTagName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TagStatusFilter>("all");
  const tagNameInputRef = useRef<HTMLInputElement | null>(null);

  if (tagsQuery.isPending) {
    return (
      <AppPanel className="border-white/8 bg-[#1f1f23]">
        <p className="text-sm text-slate-400">Loading tags…</p>
      </AppPanel>
    );
  }

  if (tagsQuery.isError) {
    return (
      <AppPanel className="border-rose-500/30 bg-[#23181b]">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Tags</h1>
          <p className="text-sm leading-6 text-rose-300">
            Unable to load tags. Refresh to try again.
          </p>
        </div>
      </AppPanel>
    );
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
    setStatusFilter("all");
    setStatus("Tag created");
  }

  return (
    <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="tags-page">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Tags</h1>
          <p className="text-sm text-slate-500">Tag directory</p>
          <p className="text-sm leading-6 text-slate-400">
            Keep tag usage visible from the shared tracking catalog so list, filter, and detail
            entry points align with the project page skeleton.
          </p>
        </div>
        <AppButton onClick={() => tagNameInputRef.current?.focus()} type="button">
          Create tag
        </AppButton>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3" data-testid="tags-filter-bar">
        <label className="flex min-w-[14rem] flex-col gap-2 text-sm font-medium text-slate-300">
          Tag status filter
          <select
            aria-label="Tag status filter"
            className="rounded-xl border border-white/10 bg-[#18181c] px-4 py-3 text-sm text-white"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as TagStatusFilter)}
          >
            <option value="all">All tags</option>
            <option value="active">Active tags</option>
            <option value="inactive">Inactive tags</option>
          </select>
        </label>
      </div>

      <form className="mt-4 flex flex-wrap items-end gap-3" data-testid="tags-create-form" onSubmit={handleCreateTag}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-300">
          Tag name
          <input
            ref={tagNameInputRef}
            className="rounded-xl border border-white/10 bg-[#18181c] px-4 py-3 text-white"
            value={tagName}
            onChange={(event) => setTagName(event.target.value)}
          />
        </label>
        <AppButton
          disabled={trimmedTagName.length === 0 || createTagMutation.isPending}
          type="submit"
        >
          Save tag
        </AppButton>
        {status ? <p className="text-sm font-medium text-[#dface3]">{status}</p> : null}
      </form>

      {filteredTags.length > 0 ? (
        <ul className="mt-6 divide-y divide-white/8" aria-label="Tags list" data-testid="tags-list">
          <li className="py-2 text-[11px] font-medium uppercase text-slate-500">
            Workspace {session.currentWorkspace.id}
          </li>
          {filteredTags.map((tag) => {
            const statusLabel = tag.deleted_at ? "Inactive" : "Active";

            return (
              <li key={tag.id} className="flex items-center justify-between py-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{tag.name}</p>
                  <p className="text-xs text-slate-400">Tag · {statusLabel}</p>
                  <p className="text-[11px] text-slate-500">Workspace {tag.workspace_id}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    aria-label={`Tag details for ${tag.name}`}
                    className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/8"
                    href={`/workspaces/${session.currentWorkspace.id}/tags/${tag.id}`}
                  >
                    Tag details
                  </a>
                  <span className="rounded-lg border border-white/10 bg-[#18181c] px-3 py-1 text-xs font-medium text-slate-300">
                    {statusLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div
          className="mt-6 rounded-xl border border-dashed border-white/12 bg-[#18181c] px-5 py-6"
          data-testid="tags-empty-state"
        >
          <p className="text-sm font-semibold text-white">{emptyStateTitle(statusFilter)}</p>
          <p className="mt-1 text-sm text-slate-400">Switch filters or create a tag to continue.</p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-white/10 bg-[#18181c] p-3 text-sm text-slate-300" data-testid="tags-summary">
        <p>
          Showing {tags.length} tags in workspace {session.currentWorkspace.id}.
        </p>
        <p className="mt-1">
          Active: {activeCount} · Inactive: {inactiveCount}
        </p>
      </div>
    </AppPanel>
  );
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
  return Boolean(value) && typeof value === "object" && Array.isArray((value as Record<string, unknown>)[key]);
}
