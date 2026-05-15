import { type FormEvent, type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AppButton, AppInput, SelectDropdown } from "@opentickly/web-ui";

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
          <AppButton onClick={onClose} size="sm" type="button" variant="secondary">
            {t("cancel")}
          </AppButton>
          <AppButton
            disabled={mutation.isPending || !trimmedEmail}
            form="invite-member-form"
            size="sm"
            type="submit"
          >
            {t("sendInvite")}
          </AppButton>
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
            <AppInput
              aria-label={t("emailAddress")}
              className="h-11 rounded-[8px]"
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
  if (error instanceof WebApiError) {
    const code = invitePreconditionCode(error);
    if (code === "smtp_not_configured") {
      return t("toast:emailSendingNotConfigured");
    }
    if (code === "site_url_not_configured") {
      return t("toast:siteUrlNotConfigured");
    }
    return error.userMessage || t("couldNotSendInvitation");
  }
  return t("couldNotSendInvitation");
}

function invitePreconditionCode(error: WebApiError): string | null {
  if (error.status === 422) {
    const data = error.data;
    if (typeof data === "object" && data !== null && "error" in data) {
      const code = (data as { error?: unknown }).error;
      if (typeof code === "string") {
        return code;
      }
    }
  }
  const message = error.userMessage ?? "";
  if (message.includes("smtp_not_configured") || message.includes("SMTP")) {
    return "smtp_not_configured";
  }
  if (message.includes("site_url_not_configured") || message.includes("site URL")) {
    return "site_url_not_configured";
  }
  return null;
}
