import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppButton,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  DirectoryTableRenderCountBadge,
  PageLayout,
} from "@opentickly/web-ui";

import { CloseIcon, PlusIcon, TagsIcon } from "../../shared/ui/icons.tsx";
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
import { normalizeTags } from "./tags-page-helpers.ts";

type TagRow = ReturnType<typeof normalizeTags>[number];

const TAG_COLUMNS: DirectoryTableColumn[] = [
  { key: "dot", label: "", width: "42px" },
  { key: "name", label: "Tag", width: "minmax(0,1fr)" },
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
  const [status, setStatus] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");

  if (tagsQuery.isPending) {
    return <DirectorySurfaceMessage message={t("loadingTags")} />;
  }

  if (tagsQuery.isError) {
    return <DirectorySurfaceMessage message={t("unableToLoadTags")} tone="error" />;
  }

  const tags = normalizeTags(tagsQuery.data);
  const filteredTags = tags.filter((tag) => {
    if (nameFilter.trim() && !tag.name.toLowerCase().includes(nameFilter.trim().toLowerCase()))
      return false;
    return true;
  });
  async function handleCreateTag(name: string) {
    if (name.length === 0) {
      return;
    }

    await createTagMutation.mutateAsync(name);
    setCreateDialogOpen(false);
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
            <span>{t("filters")}</span>
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
          {t("showingTagsCount", {
            count: tags.length,
            workspaceName: session.currentWorkspace.name,
          })}
        </div>
      }
    >
      <DirectoryTable<TagRow>
        columns={TAG_COLUMNS}
        rows={filteredTags}
        rowKey={(tag) => tag.id}
        isRowEqual={(a, b) => a.id === b.id && a.name === b.name && a.deleted_at === b.deleted_at}
        data-testid="tags-list"
        data-row-testid="tag-row"
        emptyIcon={<TagsIcon className="size-5" />}
        emptyTitle={nameFilter.trim() ? t("noTagsMatchFilters") : t("noTagsInWorkspace")}
        emptyDescription={!nameFilter.trim() ? t("createFirstTagHint") : undefined}
        emptyAction={
          !nameFilter.trim() ? (
            <AppButton
              onClick={() => setCreateDialogOpen(true)}
              data-testid="tags-empty-state-create"
            >
              <PlusIcon className="size-3.5" />
              {t("newTag")}
            </AppButton>
          ) : undefined
        }
        renderRow={(tag) => (
          <>
            <div className="flex h-[44px] items-center">
              <span
                className="size-2 rounded-full"
                data-testid="tag-color"
                style={{ backgroundColor: resolveProjectColorValue({ name: tag.name }) }}
              />
            </div>
            <div className="flex h-[44px] items-center gap-2 overflow-hidden">
              <a
                aria-label={t("tagDetailsFor", { name: tag.name })}
                className="truncate text-[14px] text-white"
                data-testid="tag-name"
                href={`/workspaces/${workspaceId}/tags/${tag.id}`}
              >
                {tag.name}
              </a>
              <DirectoryTableRenderCountBadge />
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
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={(values) => {
            void handleCreateTag(values.name);
          }}
          submitLabel={t("createTag")}
          title={t("createNewTag")}
        />
      ) : null}
    </PageLayout>
  );
}
