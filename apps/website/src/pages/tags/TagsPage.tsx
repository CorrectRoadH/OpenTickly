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
      <AppPanel className="bg-white/95">
        <p className="text-sm text-slate-600">Loading tags…</p>
      </AppPanel>
    );
  }

  if (tagsQuery.isError) {
    return (
      <AppPanel className="bg-white/95">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Tags</h1>
          <p className="text-sm leading-6 text-rose-700">
            Unable to load tags. Refresh to try again.
          </p>
        </div>
      </AppPanel>
    );
  }

  const tags = tagsQuery.data?.tags ?? [];
  const filteredTags = tags.filter((tag) => {
    if (statusFilter === "active") {
      return tag.active;
    }

    if (statusFilter === "inactive") {
      return !tag.active;
    }

    return true;
  });
  const activeCount = tags.filter((tag) => tag.active).length;
  const inactiveCount = tags.length - activeCount;
  const trimmedTagName = tagName.trim();

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmedTagName.length === 0) {
      return;
    }

    await createTagMutation.mutateAsync({
      workspace_id: session.currentWorkspace.id,
      name: trimmedTagName,
    });
    setTagName("");
    setStatusFilter("all");
    setStatus("Tag created");
  }

  return (
    <AppPanel className="bg-white/95">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Tags</h1>
          <p className="text-sm leading-6 text-slate-600">Tag directory</p>
        </div>
        <AppButton onClick={() => tagNameInputRef.current?.focus()} type="button">
          Create tag
        </AppButton>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Tag status filter
          <select
            aria-label="Tag status filter"
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as TagStatusFilter)}
          >
            <option value="all">All tags</option>
            <option value="active">Active tags</option>
            <option value="inactive">Inactive tags</option>
          </select>
        </label>
      </div>

      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={handleCreateTag}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Tag name
          <input
            ref={tagNameInputRef}
            className="rounded-2xl border border-slate-300 px-4 py-3"
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
        {status ? <p className="text-sm font-medium text-emerald-700">{status}</p> : null}
      </form>

      {filteredTags.length > 0 ? (
        <ul className="mt-6 divide-y divide-slate-200" aria-label="Tags list">
          {filteredTags.map((tag) => {
            const statusLabel = tag.active ? "Active" : "Inactive";

            return (
              <li key={tag.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{tag.name}</p>
                  <p className="text-xs text-slate-600">Tag · {statusLabel}</p>
                  <p className="text-[11px] text-slate-500">Workspace {tag.workspace_id}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    aria-label={`Tag details for ${tag.name}`}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-800"
                    href={`/workspaces/${session.currentWorkspace.id}/tags/${tag.id}`}
                  >
                    Tag details
                  </a>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {statusLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
          <p className="text-sm font-semibold text-slate-900">{emptyStateTitle(statusFilter)}</p>
          <p className="mt-1 text-sm text-slate-600">Switch filters or create a tag to continue.</p>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
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
