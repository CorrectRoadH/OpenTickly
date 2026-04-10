import {
  AppButton,
  AppSurfaceState,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DirectoryTable,
  type DirectoryTableColumn,
  DirectoryTableCell,
  PageHeader,
  SurfaceCard,
} from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSession } from "../../shared/session/session-context.tsx";
import type { ModelsWebhookSubscription } from "../../shared/api/public/webhooks/index.ts";
import { WebApiError } from "../../shared/api/web-client.ts";
import {
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  usePingWebhookMutation,
  useToggleWebhookMutation,
  useUpdateWebhookMutation,
  useWebhookEventFiltersQuery,
  useWebhookSubscriptionsQuery,
} from "../../shared/query/web-shell-webhooks.ts";
import { WebhookFormDialog } from "../../features/webhooks/WebhookFormDialog.tsx";
import { WebhookActions } from "../../features/webhooks/WebhookActions.tsx";

export function IntegrationsPage(): ReactElement {
  const { t } = useTranslation("integrations");
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;

  const subscriptionsQuery = useWebhookSubscriptionsQuery(workspaceId);
  const eventFiltersQuery = useWebhookEventFiltersQuery();
  const createMutation = useCreateWebhookMutation(workspaceId);
  const updateMutation = useUpdateWebhookMutation(workspaceId);
  const toggleMutation = useToggleWebhookMutation(workspaceId);
  const deleteMutation = useDeleteWebhookMutation(workspaceId);
  const pingMutation = usePingWebhookMutation(workspaceId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<ModelsWebhookSubscription | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ModelsWebhookSubscription | null>(null);

  function handleCreate() {
    setEditingSubscription(null);
    setFormOpen(true);
  }

  function handleEdit(sub: ModelsWebhookSubscription) {
    setEditingSubscription(sub);
    setFormOpen(true);
  }

  async function handleFormSubmit(data: ModelsWebhookSubscription) {
    try {
      if (editingSubscription?.subscription_id) {
        await updateMutation.mutateAsync({
          subscriptionId: editingSubscription.subscription_id,
          body: data,
        });
        toast.success(t("webhookUpdated"));
      } else {
        await createMutation.mutateAsync(data);
        toast.success(t("webhookCreated"));
      }
      setFormOpen(false);
    } catch (error) {
      if (error instanceof WebApiError) {
        toast.error(error.userMessage);
      }
    }
  }

  async function handleToggle(sub: ModelsWebhookSubscription) {
    try {
      await toggleMutation.mutateAsync({
        subscriptionId: sub.subscription_id!,
        enabled: !sub.enabled,
      });
    } catch (error) {
      if (error instanceof WebApiError) {
        toast.error(error.userMessage);
      }
    }
  }

  async function handlePing(sub: ModelsWebhookSubscription) {
    try {
      await pingMutation.mutateAsync(sub.subscription_id!);
      toast.success(t("pingSuccess"));
    } catch (error) {
      if (error instanceof WebApiError) {
        toast.error(error.userMessage);
      }
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.subscription_id) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.subscription_id);
      toast.success(t("webhookDeleted"));
      setDeleteTarget(null);
    } catch (error) {
      if (error instanceof WebApiError) {
        toast.error(error.userMessage);
      }
    }
  }

  function formatStatus(sub: ModelsWebhookSubscription): string {
    if (!sub.validated_at) return t("statusNotValidated");
    if (!sub.enabled) return t("statusDisabled");
    return t("statusActive");
  }

  function statusColor(sub: ModelsWebhookSubscription): string {
    if (!sub.validated_at) return "text-yellow-400";
    if (!sub.enabled) return "text-[var(--track-text-muted)]";
    return "text-green-400";
  }

  const columns: DirectoryTableColumn[] = [
    { key: "description", label: t("columnName"), width: "1fr" },
    { key: "url_callback", label: t("columnUrl"), width: "2fr" },
    { key: "events", label: t("columnEvents"), width: "80px" },
    { key: "status", label: t("columnStatus"), width: "120px" },
    { key: "actions", label: "", width: "80px" },
  ];

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="integrations-page"
    >
      <PageHeader
        action={
          <AppButton onClick={handleCreate} size="sm">
            {t("createWebhook")}
          </AppButton>
        }
        bordered
        title={t("webhooks")}
      />
      <div className="px-5 py-6">
        <SurfaceCard>
          {subscriptionsQuery.isLoading ? (
            <AppSurfaceState description="" title={t("webhooks")} tone="loading" />
          ) : subscriptionsQuery.isError ? (
            <AppSurfaceState description="" title={t("webhooks")} tone="error" />
          ) : (
            <DirectoryTable
              columns={columns}
              emptyDescription={t("emptyState")}
              emptyAction={
                <AppButton onClick={handleCreate} size="sm">
                  {t("createWebhook")}
                </AppButton>
              }
              renderRow={(sub: ModelsWebhookSubscription) => (
                <>
                  <DirectoryTableCell>
                    <span className="font-medium text-white">{sub.description}</span>
                  </DirectoryTableCell>
                  <DirectoryTableCell>
                    <span className="block truncate text-[var(--track-text-muted)]">
                      {sub.url_callback}
                    </span>
                  </DirectoryTableCell>
                  <DirectoryTableCell>
                    <span className="text-[var(--track-text-muted)]">
                      {sub.event_filters?.length ?? 0}
                    </span>
                  </DirectoryTableCell>
                  <DirectoryTableCell>
                    <span className={statusColor(sub)}>{formatStatus(sub)}</span>
                  </DirectoryTableCell>
                  <DirectoryTableCell>
                    <WebhookActions
                      subscription={sub}
                      onDelete={() => setDeleteTarget(sub)}
                      onEdit={() => handleEdit(sub)}
                      onPing={() => handlePing(sub)}
                      onToggle={() => handleToggle(sub)}
                    />
                  </DirectoryTableCell>
                </>
              )}
              rowKey={(sub: ModelsWebhookSubscription) => sub.subscription_id ?? 0}
              rows={subscriptionsQuery.data ?? []}
            />
          )}
        </SurfaceCard>
      </div>

      {formOpen && (
        <WebhookFormDialog
          availableFilters={eventFiltersQuery.data}
          editing={editingSubscription}
          loading={createMutation.isPending || updateMutation.isPending}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}

      {deleteTarget && (
        <Dialog onClose={() => setDeleteTarget(null)}>
          <DialogHeader onClose={() => setDeleteTarget(null)} title={t("deleteTitle")} />
          <DialogBody>
            <p className="text-[var(--track-text-secondary)]">
              {t("deleteConfirm", { name: deleteTarget.description })}
            </p>
          </DialogBody>
          <DialogFooter>
            <AppButton onClick={() => setDeleteTarget(null)} size="sm" variant="ghost">
              {t("cancel")}
            </AppButton>
            <AppButton danger disabled={deleteMutation.isPending} onClick={handleDelete} size="sm">
              {t("delete")}
            </AppButton>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
