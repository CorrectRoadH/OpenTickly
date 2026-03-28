import type { ReactElement, ReactNode } from "react";

import { useDialogDismiss } from "./useDialogDismiss.ts";

type ModalDialogProps = {
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  testId?: string;
  title: string;
  titleId?: string;
  width?: string;
};

/**
 * Shared modal dialog container for full-screen backdrop + centered card dialogs.
 *
 * Covers: CreateNameDialog, InviteMemberDialog, ProjectEditorDialog,
 * GoalEditorDialog, KeyboardShortcutsDialog, BulkEditDialog.
 *
 * Does NOT cover anchored panels (TimeEntryEditorDialog, TimerComposerSuggestionsDialog).
 */
export function ModalDialog({
  children,
  footer,
  onClose,
  testId,
  title,
  titleId,
  width = "max-w-[420px]",
}: ModalDialogProps): ReactElement {
  useDialogDismiss(onClose);

  const resolvedTitleId = titleId ?? "modal-dialog-title";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-10"
      onClick={onClose}
    >
      <div
        aria-labelledby={resolvedTitleId}
        aria-modal="true"
        className={`w-full ${width} max-h-[calc(100vh-80px)] overflow-y-auto rounded-[14px] border border-[var(--track-overlay-border-strong)] bg-[var(--track-overlay-surface)] px-5 pb-5 pt-4 shadow-[0_18px_40px_var(--track-shadow-modal)]`}
        data-testid={testId}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[18px] font-medium text-white" id={resolvedTitleId}>
            {title}
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
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-5 flex items-center justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
