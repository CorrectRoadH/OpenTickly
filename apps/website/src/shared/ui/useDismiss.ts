import { type RefObject, useEffect } from "react";

/**
 * Handles click-outside and Escape key dismissal for popovers, dropdowns, and menus.
 * Combines the two most duplicated event-listener patterns (20+ files) into one hook.
 *
 * For modal dialogs that use a backdrop overlay for click-outside, use useDialogDismiss instead.
 */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [ref, isOpen, onClose]);
}
