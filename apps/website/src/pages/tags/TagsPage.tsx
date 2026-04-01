import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppButton,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  PageLayout,
  RadioFilterDropdown,
} from "@opentoggl/web-ui";

import { CloseIcon, PlusIcon } from "../../shared/ui/icons.tsx";
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
  const { t } = useTranslation("tags");
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
  const [nameFilter, setNameFilter] = useState("");

  if (tagsQuery.isPending) {
    return <DirectorySurfaceMessage message={t("loadingTags")} />;
  }

  if (tagsQuery.isError) {
    return <DirectorySurfaceMessage message={t("unableToLoadTags")} tone="error" />;
  }

  const tags = normalizeTags(tagsQuery.data);
  const filteredTags = tags.filter((tag) => {
    if (statusFilter === "active" && tag.deleted_at) return false;
    if (statusFilter === "inactive" && !tag.deleted_at) return false;
    if (nameFilter.trim() && !tag.name.toLowerCase().includes(nameFilter.trim().toLowerCase()))
      return false;
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
    setStatus(t("tagCreated"));
  }

  return (
    <PageLayout
      data-testid="tags-page"
      title={t("tags")}
      headerActions={
        <AppButton
          data-testid="tags-create-button"
          onClick={() => setCreateDialogOpen(true)}
          type="button"
        >
          <PlusIcon className="size-3.5" />
          {t("newTag")}
        </AppButton>
      }
      toolbar={
        <>
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            <span>Filters:</span>
            <div className="relative flex items-center">
              <input
                className="h-9 w-[160px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] normal-case tracking-normal text-white placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none"
                data-testid="tags-filter-name"
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder={t("tagName")}
                type="text"
                value={nameFilter}
              />
              {nameFilter.trim() ? (
                <button
                  className="absolute right-2 text-[var(--track-text-muted)] hover:text-white"
                  onClick={() => setNameFilter("")}
                  type="button"
                >
                  <CloseIcon className="size-3" />
                </button>
              ) : null}
            </div>
            <RadioFilterDropdown
              label="Status"
              onChange={(value) => setStatusFilter(value)}
              options={[
                { key: "all" as const, label: "All" },
                { key: "active" as const, label: "Active" },
                { key: "inactive" as const, label: "Inactive" },
              ]}
              selected={statusFilter}
              testId="tags-filter-status"
            />
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
        data-row-testid="tag-row"
        emptyState={<span data-testid="tags-empty-state">{emptyTagsStateTitle(statusFilter)}</span>}
        renderRow={(tag) => (
          <>
            <div className="flex h-[44px] items-center">
              <span
                className="size-2 rounded-full"
                data-testid="tag-color"
                style={{ backgroundColor: resolveProjectColorValue({ name: tag.name }) }}
              />
            </div>
            <div className="flex h-[44px] items-center overflow-hidden">
              <a
                aria-label={`Tag details for ${tag.name}`}
                className="truncate text-[14px] text-white"
                data-testid="tag-name"
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
                    setStatus(t("tagDeleted"));
                  });
                }}
                onRename={(tagId, name) => {
                  void updateTagMutation.mutateAsync({ tagId, name }).then(() => {
                    setStatus(t("tagRenamed"));
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
          nameLabel={t("tagName")}
          testId="create-tag-dialog"
          namePlaceholder={t("tagName")}
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
