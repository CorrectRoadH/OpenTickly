import { useEffect, useRef } from "react";

// Preserve window scrolling to the current time or an earlier visible entry.
export function useCalendarScroll() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const EARLIEST_EVENT_HEADER_MARGIN_PX = 80;

    const computeEarliestEventAbsoluteTop = (): number | null => {
      const cards = wrapper.querySelectorAll<HTMLElement>('[data-testid^="calendar-entry-"]');
      if (cards.length === 0) return null;
      let min = Number.POSITIVE_INFINITY;
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        // Skip zero-height placeholders during layout.
        if (rect.height <= 0) continue;
        const absoluteTop = rect.top + window.scrollY;
        if (absoluteTop < min) min = absoluteTop;
      }
      return Number.isFinite(min) ? min : null;
    };

    const applyScrollFor = (indicator: HTMLElement) => {
      const indicatorAbsoluteY = indicator.getBoundingClientRect().top + window.scrollY;
      const nowCenteredTarget = indicatorAbsoluteY - window.innerHeight / 2;
      const earliestEventTop = computeEarliestEventAbsoluteTop();
      const target =
        earliestEventTop !== null
          ? Math.min(nowCenteredTarget, earliestEventTop - EARLIEST_EVENT_HEADER_MARGIN_PX)
          : nowCenteredTarget;
      if (target > 0) {
        window.scrollTo({ top: target, behavior: "instant" });
        wrapper.dataset.scrollToNow = "done";
      } else {
        wrapper.dataset.scrollToNow = "skipped";
      }
    };

    const existing = wrapper.querySelector<HTMLElement>(".rbc-current-time-indicator");
    if (existing) {
      applyScrollFor(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = wrapper.querySelector<HTMLElement>(".rbc-current-time-indicator");
      if (el) {
        applyScrollFor(el);
        observer.disconnect();
      }
    });
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return wrapperRef;
}
