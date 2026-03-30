import { type FormEvent, type ReactElement } from "react";
import { SelectDropdown } from "@opentoggl/web-ui";

import { ModalDialog } from "../../shared/ui/ModalDialog.tsx";

type InviteMemberDialogProps = {
  email: string;
  isPending: boolean;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onSubmit: () => void;
  role: string;
};

export function InviteMemberDialog({
  email,
  isPending,
  onClose,
  onEmailChange,
  onRoleChange,
  onSubmit,
  role,
}: InviteMemberDialogProps): ReactElement {
  const trimmedEmail = email.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedEmail || isPending) {
      return;
    }
    onSubmit();
  }

  return (
    <ModalDialog onClose={onClose} title="Invite member" titleId="invite-member-dialog-title">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              Email address
            </span>
            <input
              aria-label="Email address"
              className="h-11 w-full rounded-md border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="colleague@company.com"
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              Role
            </span>
            <SelectDropdown
              aria-label="Member role"
              onChange={(v) => onRoleChange(v)}
              options={[
                { value: "member", label: "Member" },
                { value: "admin", label: "Admin" },
              ]}
              value={role}
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            className="flex h-9 items-center rounded-md border border-[var(--track-border)] px-4 text-[12px] text-[var(--track-text-muted)]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex h-9 items-center rounded-md bg-[var(--track-button)] px-4 text-[12px] font-medium text-black disabled:opacity-60"
            disabled={isPending || !trimmedEmail}
            type="submit"
          >
            Send invite
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
