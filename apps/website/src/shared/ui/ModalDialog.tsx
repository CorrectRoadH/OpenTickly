import type { ReactElement, ReactNode } from "react";

import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@opentoggl/web-ui";

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
 * Backwards-compatible wrapper around web-ui Dialog.
 * New code should import Dialog, DialogHeader, DialogBody, DialogFooter from @opentoggl/web-ui directly.
 */
export function ModalDialog({
  children,
  footer,
  onClose,
  testId,
  title,
  width = "max-w-[420px]",
}: ModalDialogProps): ReactElement {
  return (
    <Dialog onClose={onClose} testId={testId} width={width}>
      <DialogHeader onClose={onClose} title={title} />
      <DialogBody>{children}</DialogBody>
      {footer ? <DialogFooter>{footer}</DialogFooter> : null}
    </Dialog>
  );
}

export function ModalDialogWithNav({
  children,
  footer,
  navigation,
  onClose,
  testId,
  title,
  width = "max-w-[420px]",
}: ModalDialogProps & { navigation?: ReactNode }): ReactElement {
  return (
    <Dialog onClose={onClose} testId={testId} width={width}>
      <DialogHeader navigation={navigation} onClose={onClose} title={title} />
      <DialogBody>{children}</DialogBody>
      {footer ? <DialogFooter>{footer}</DialogFooter> : null}
    </Dialog>
  );
}
