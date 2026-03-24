import { type ReactElement, useState } from "react";
import { DirectoryFilterChip, DirectorySurfaceMessage } from "@opentoggl/web-ui";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { useCreateTagMutation, useTagsQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { CreateNameDialog } from "../../shared/ui/CreateNameDialog.tsx";
import { emptyTagsStateTitle, normalizeTags, type TagStatusFilter } from "./tags-page-helpers.ts";

export function TagsPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const tagsQuery = useTagsQuery(workspaceId);
  const createTagMutation = useCreateTagMutation(workspaceId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TagStatusFilter>("all");

  if (tagsQuery.isPending) {
    return <DirectorySurfaceMessage message="Loading tags..." />;
  }

  if (tagsQuery.isError) {
    return (
      <DirectorySurfaceMessage message="Unable to load tags. Refresh to try again." tone="error" />
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

  async function handleCreateTag() {
    if (trimmedTagName.length === 0) {
      return;
    }

    await createTagMutation.mutateAsync(trimmedTagName);
    setTagName("");
    setCreateDialogOpen(false);
    setStatusFilter("all");
    setStatus("Tag created");
  }

  return (
    <div className="w-full min-w-0 bg-[var(--track-surface)] text-white" data-testid="tags-page">
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <h1 className="text-[21px] font-semibold leading-[30px] text-white">Tags</h1>
          <button
            className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black"
            data-testid="tags-create-button"
            onClick={() => setCreateDialogOpen(true)}
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
              className="h-9 appearance-none rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 pr-8 text-[12px] text-white"
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
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            <span>Filters:</span>
            <DirectoryFilterChip label="Tag name" />
            <DirectoryFilterChip label="Status" />
          </div>
          {status ? (
            <span className="ml-auto text-[12px] text-[var(--track-accent-text)]">{status}</span>
          ) : null}
        </div>
      </header>

      {filteredTags.length > 0 ? (
        <div data-testid="tags-list">
          <div className="grid grid-cols-[42px_minmax(0,1fr)_120px_98px_42px] border-b border-[var(--track-border)] px-5 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
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
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: resolveProjectColorValue({ name: tag.name }) }}
                />
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
          <p className="text-sm text-[var(--track-text-muted)]">
            {emptyTagsStateTitle(statusFilter)}
          </p>
        </div>
      )}

      <div
        className="border-t border-[var(--track-border)] px-5 py-3 text-[11px] text-[var(--track-text-muted)]"
        data-testid="tags-summary"
      >
        Showing {tags.length} tags in workspace {workspaceId}. Active: {activeCount} · Inactive:{" "}
        {inactiveCount}
      </div>

      {createDialogOpen ? (
        <CreateNameDialog
          isPending={createTagMutation.isPending}
          nameLabel="Tag name"
          namePlaceholder="Tag name"
          nameValue={tagName}
          onClose={() => setCreateDialogOpen(false)}
          onNameChange={setTagName}
          onSubmit={() => {
            void handleCreateTag();
          }}
          submitLabel="Create tag"
          title="Create new tag"
        />
      ) : null}
    </div>
  );
}
