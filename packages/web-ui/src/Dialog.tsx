import { type ReactElement, type ReactNode, useEffect } from "react";

import { IconButton } from "./IconButton.tsx";

// ---------------------------------------------------------------------------
// Dialog — full-screen backdrop + centered card
// ---------------------------------------------------------------------------

type DialogProps = {
  children: ReactNode;
  onClose: () => void;
  testId?: string;
  width?: string;
};

/**
 * Modal dialog with backdrop, Escape dismiss, and click-outside-to-close.
 *
 * Compose with DialogHeader, DialogBody, and DialogFooter:
 * ```tsx
 * <Dialog onClose={onClose}>
 *   <DialogHeader title="Create project" onClose={onClose} />
 *   <DialogBody>...</DialogBody>
 *   <DialogFooter>
 *     <AppButton onClick={onClose}>Cancel</AppButton>
 *     <AppButton onClick={onSubmit}>Create</AppButton>
 *   </DialogFooter>
 * </Dialog>
 * ```
 */
export function Dialog({
  children,
  onClose,
  testId,
  width = "max-w-[420px]",
}: DialogProps): ReactElement {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--track-overlay-backdrop)] px-4"
      onClick={onClose}
    >
      <div
        aria-modal="true"
        className={`w-full ${width} max-h-[calc(100vh-80px)] overflow-y-auto rounded-[18px] border-2 border-[var(--track-overlay-border-strong)] bg-[var(--track-overlay-surface)] px-5 pb-5 pt-4 shadow-[var(--track-depth-shadow-rest)]`}
        data-testid={testId}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DialogHeader
// ---------------------------------------------------------------------------

type DialogHeaderProps = {
  navigation?: ReactNode;
  onClose: () => void;
  title: string;
};

export function DialogHeader({ navigation, onClose, title }: DialogHeaderProps): ReactElement {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[14px] font-semibold text-white">{title}</h2>
        <IconButton aria-label="Close dialog" onClick={onClose} size="sm">
          ×
        </IconButton>
      </div>
      {navigation && <div className="mt-3">{navigation}</div>}
    </>
  );
}

// ---------------------------------------------------------------------------
// DialogBody
// ---------------------------------------------------------------------------

export function DialogBody({ children }: { children: ReactNode }): ReactElement {
  return <div className="mt-4">{children}</div>;
}

// ---------------------------------------------------------------------------
// DialogFooter
// ---------------------------------------------------------------------------

export function DialogFooter({ children }: { children: ReactNode }): ReactElement {
  return <div className="mt-5 flex items-center justify-end gap-2">{children}</div>;
}
