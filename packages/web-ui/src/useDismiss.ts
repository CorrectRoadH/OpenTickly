import { type RefObject, useEffect } from "react";

/**
 * Click-outside + Escape key dismiss for dropdowns, popovers, and menus.
 *
 * Attaches mousedown + keydown listeners to document when `isOpen` is true.
 * Calls `onClose` when a click lands outside `ref` or Escape is pressed.
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
