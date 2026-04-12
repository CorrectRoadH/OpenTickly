import { type FormEvent, type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SelectDropdown } from "@opentoggl/web-ui";

import { WebApiError } from "../../shared/api/web-client.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { useInviteWorkspaceMemberMutation } from "../../shared/query/web-shell.ts";
import { ModalDialog } from "../../shared/ui/ModalDialog.tsx";

type InviteMemberDialogProps = {
  onClose: () => void;
};

export function InviteMemberDialog({ onClose }: InviteMemberDialogProps): ReactElement {
  const { t } = useTranslation("members");
  const session = useSession();
  const mutation = useInviteWorkspaceMemberMutation(session.currentWorkspace.id);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const trimmedEmail = email.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedEmail || mutation.isPending) {
      return;
    }
    mutation.mutate(
      { email: trimmedEmail, role },
      {
        onSuccess: () => {
          toast.success(t("toast:invitationSent", { email: trimmedEmail }));
          onClose();
        },
        onError: (error) => {
          toast.error(resolveInviteErrorMessage(error, t));
        },
      },
    );
  }

  return (
    <ModalDialog
      footer={
        <>
          <button
            className="flex h-9 items-center rounded-md border border-[var(--track-border)] px-4 text-[12px] text-[var(--track-text-muted)]"
            onClick={onClose}
            type="button"
          >
            {t("cancel")}
          </button>
          <button
            className="flex h-9 items-center rounded-md bg-[var(--track-button)] px-4 text-[12px] font-medium text-black disabled:opacity-60"
            disabled={mutation.isPending || !trimmedEmail}
            form="invite-member-form"
            type="submit"
          >
            {t("sendInvite")}
          </button>
        </>
      }
      onClose={onClose}
      title={t("inviteMemberDialogTitle")}
      titleId="invite-member-dialog-title"
    >
      <form id="invite-member-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              {t("emailAddress")}
            </span>
            <input
              aria-label={t("emailAddress")}
              className="h-11 w-full rounded-md border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colleague@company.com"
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              {t("role")}
            </span>
            <SelectDropdown
              aria-label={t("role")}
              onChange={(v) => setRole(v)}
              options={[
                { value: "member", label: t("member") },
                { value: "admin", label: t("admin") },
              ]}
              value={role}
            />
          </label>
        </div>
      </form>
    </ModalDialog>
  );
}

function resolveInviteErrorMessage(error: unknown, t: (key: string) => string): string {
  const raw = error instanceof WebApiError ? error.userMessage : t("couldNotSendInvitation");
  if (raw.includes("SMTP") || raw.includes("email sending")) {
    return t("toast:emailSendingNotConfigured");
  }
  return raw;
}
