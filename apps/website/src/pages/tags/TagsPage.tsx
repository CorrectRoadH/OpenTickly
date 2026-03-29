import { type ReactElement, useState } from "react";
import {
  AppButton,
  DirectoryFilterChip,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  PageLayout,
  SelectField,
} from "@opentoggl/web-ui";

import { PlusIcon } from "../../shared/ui/icons.tsx";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import {
  useCreateTagMutation,
  useDeleteTagMutation,
  useUpdateTagMutation,
  useTagsQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { CreateNameDialog } from "../../shared/ui/CreateNameDialog.tsx";
import { TagRowActions } from "./TagRowActions.tsx";
import { emptyTagsStateTitle, normalizeTags, type TagStatusFilter } from "./tags-page-helpers.ts";

type TagRow = ReturnType<typeof normalizeTags>[number];

const TAG_COLUMNS: DirectoryTableColumn[] = [
  { key: "dot", label: "", width: "42px" },
  { key: "name", label: "Tag", width: "minmax(0,1fr)" },
  { key: "status", label: "Status", width: "98px" },
  { key: "actions", label: "", width: "42px", align: "end" },
];

export function TagsPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const tagsQuery = useTagsQuery(workspaceId);
  const createTagMutation = useCreateTagMutation(workspaceId);
  const updateTagMutation = useUpdateTagMutation(workspaceId);
  const deleteTagMutation = useDeleteTagMutation(workspaceId);
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
    <PageLayout
      data-testid="tags-page"
      title="Tags"
      headerActions={
        <AppButton
          data-testid="tags-create-button"
          onClick={() => setCreateDialogOpen(true)}
          type="button"
        >
          <PlusIcon className="size-3.5" />
          New tag
        </AppButton>
      }
      toolbar={
        <>
          <SelectField
            aria-label="Tag status filter"
            onChange={(event) => setStatusFilter(event.target.value as TagStatusFilter)}
            value={statusFilter}
          >
            <option value="all">All tags</option>
            <option value="active">Active tags</option>
            <option value="inactive">Inactive tags</option>
          </SelectField>
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            <span>Filters:</span>
            <DirectoryFilterChip label="Tag name" />
            <DirectoryFilterChip label="Status" />
          </div>
          {status ? (
            <span className="ml-auto text-[12px] text-[var(--track-accent-text)]">{status}</span>
          ) : null}
        </>
      }
      footer={
        <div
          className="border-t border-[var(--track-border)] px-5 py-3 text-[11px] text-[var(--track-text-muted)]"
          data-testid="tags-summary"
        >
          Showing {tags.length} tags in {session.currentWorkspace.name}. Active: {activeCount} ·
          Inactive: {inactiveCount}
        </div>
      }
    >
      <DirectoryTable<TagRow>
        columns={TAG_COLUMNS}
        rows={filteredTags}
        rowKey={(tag) => tag.id}
        data-testid="tags-list"
        emptyState={<span data-testid="tags-empty-state">{emptyTagsStateTitle(statusFilter)}</span>}
        renderRow={(tag) => (
          <>
            <div className="flex h-[44px] items-center">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: resolveProjectColorValue({ name: tag.name }) }}
              />
            </div>
            <div className="flex h-[44px] items-center overflow-hidden">
              <a
                aria-label={`Tag details for ${tag.name}`}
                className="truncate text-[14px] text-white"
                href={`/workspaces/${workspaceId}/tags/${tag.id}`}
              >
                {tag.name}
              </a>
            </div>
            <div className="flex h-[44px] items-center text-[14px] text-white">
              {tag.deleted_at ? "Inactive" : "Active"}
            </div>
            <div className="flex h-[44px] items-center justify-end">
              <TagRowActions
                tagId={tag.id}
                tagName={tag.name}
                onDelete={(tagId) => {
                  void deleteTagMutation.mutateAsync(tagId).then(() => {
                    setStatus("Tag deleted");
                  });
                }}
                onRename={(tagId, name) => {
                  void updateTagMutation.mutateAsync({ tagId, name }).then(() => {
                    setStatus("Tag renamed");
                  });
                }}
              />
            </div>
          </>
        )}
      />

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
    </PageLayout>
  );
}
