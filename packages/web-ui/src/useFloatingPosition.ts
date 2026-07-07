import { type RefObject, useEffect, useState } from "react";

/**
 * - "bottom-left" / "bottom-right": panel below trigger, aligned left or right edge
 * - "right-bottom": panel to the right of trigger, bottom-aligned (e.g. sidebar profile)
 */
export type DropdownPlacement = "bottom-left" | "bottom-right" | "right-bottom";

type FloatingStyle = {
  bottom?: number;
  left?: number;
  right?: number;
  top?: number;
};

export const VIEWPORT_PADDING = 8;

function computeFloatingStyle(
  triggerRect: DOMRect,
  panelEl: HTMLElement | null,
  placement: DropdownPlacement,
  gap: number,
): FloatingStyle {
  const panelHeight = panelEl?.offsetHeight ?? 0;
  const panelWidth = panelEl?.offsetWidth ?? 0;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const availableWidth = Math.max(0, vw - VIEWPORT_PADDING * 2);
  const effectivePanelWidth = Math.min(panelWidth, availableWidth);
  const maxLeft = Math.max(VIEWPORT_PADDING, vw - effectivePanelWidth - VIEWPORT_PADDING);
  const clampLeft = (left: number) => Math.min(Math.max(VIEWPORT_PADDING, left), maxLeft);
  const clampRight = (right: number) => Math.min(Math.max(VIEWPORT_PADDING, right), maxLeft);

  switch (placement) {
    case "bottom-left": {
      const fitsBelow = triggerRect.bottom + gap + panelHeight <= vh;
      const top = fitsBelow ? triggerRect.bottom + gap : triggerRect.top - gap - panelHeight;
      return { left: clampLeft(triggerRect.left), top: Math.max(VIEWPORT_PADDING, top) };
    }
    case "bottom-right": {
      const fitsBelow = triggerRect.bottom + gap + panelHeight <= vh;
      const top = fitsBelow ? triggerRect.bottom + gap : triggerRect.top - gap - panelHeight;
      return { right: clampRight(vw - triggerRect.right), top: Math.max(VIEWPORT_PADDING, top) };
    }
    case "right-bottom": {
      const fitsRight = triggerRect.right + gap + panelWidth <= vw;
      const left = fitsRight ? triggerRect.right + gap : triggerRect.left - gap - panelWidth;
      return {
        left: clampLeft(left),
        bottom: Math.max(VIEWPORT_PADDING, vh - triggerRect.bottom),
      };
    }
  }
}

/** Computes fixed-position coordinates for a floating panel relative to its trigger. */
export function useFloatingPosition(
  triggerRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  placement: DropdownPlacement,
  gap: number,
): FloatingStyle | null {
  const [style, setStyle] = useState<FloatingStyle | null>(null);
  const [panelMounted, setPanelMounted] = useState(false);

  // Detect when panelRef gets populated (panel DOM node mounts).
  useEffect(() => {
    if (!isOpen) {
      setPanelMounted(false);
      return;
    }
    // Panel renders in the same tick as style being set. Use rAF to
    // detect when panelRef.current is available.
    const raf = requestAnimationFrame(() => {
      if (panelRef.current) setPanelMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, panelRef, style]);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setStyle(null);
      return;
    }

    function update() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setStyle(computeFloatingStyle(rect, panelRef.current, placement, gap));
    }

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, triggerRef, panelRef, placement, gap, panelMounted]);

  return style;
}
