import { type RefObject, useEffect } from "react";

type DismissRef = RefObject<HTMLElement | null>;

/**
 * Click-outside + Escape key dismiss for dropdowns, popovers, and menus.
 *
 * Attaches mousedown + keydown listeners to document when `isOpen` is true.
 * Calls `onClose` when a click lands outside every given ref (a single ref,
 * or an array of refs for panels that span multiple DOM subtrees — e.g. a
 * trigger plus a portaled panel) or when Escape is pressed.
 */
export function useDismiss(
  refs: DismissRef | DismissRef[],
  isOpen: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!isOpen) return;

    const refList = Array.isArray(refs) ? refs : [refs];

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const isInside = refList.some((ref) => ref.current?.contains(target));
      if (!isInside) {
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
  }, [refs, isOpen, onClose]);
}
