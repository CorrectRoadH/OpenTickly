import { type FormEvent, type ReactElement, useEffect } from "react";

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
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const trimmedEmail = email.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedEmail || isPending) {
      return;
    }
    onSubmit();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/55 px-4 py-10"
      onClick={onClose}
    >
      <form
        aria-labelledby="invite-member-dialog-title"
        aria-modal="true"
        className="w-full max-w-[420px] rounded-[14px] border border-[#3f3f44] bg-[#1f1f20] px-4 pb-4 pt-3 shadow-[0_18px_40px_rgba(0,0,0,0.42)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[18px] font-medium text-white" id="invite-member-dialog-title">
            Invite member
          </h2>
          <button
            aria-label="Close dialog"
            className="text-[20px] leading-none text-[var(--track-text-muted)] transition hover:text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-4 space-y-4">
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
            <select
              aria-label="Member role"
              className="h-11 w-full appearance-none rounded-md border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              onChange={(event) => onRoleChange(event.target.value)}
              value={role}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
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
    </div>
  );
}
