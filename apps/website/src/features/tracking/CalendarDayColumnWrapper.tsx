import React, { useLayoutEffect, useRef } from "react";

/**
 * Custom day column wrapper matching Toggl's StyledDayColumnWrapper.
 * Uses forwardRef because RBC's DayColumn passes a ref to dayColumnWrapper.
 * On the "today" column, appends a play button next to the RBC-rendered
 * .rbc-current-time-indicator.
 */
export const CalendarDayColumnWrapper = React.forwardRef<
  HTMLDivElement,
  {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    isNow?: boolean;
    onStartEntry?: () => void;
  }
>(function CalendarDayColumnWrapper({ children, className, style, isNow, onStartEntry }, ref) {
  const columnRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<SVGSVGElement>(null);

  const setRef = (node: HTMLDivElement | null) => {
    (columnRef as { current: HTMLDivElement | null }).current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
  };

  const syncPosition = () => {
    const indicator = columnRef.current?.querySelector<HTMLElement>(".rbc-current-time-indicator");
    if (indicator && playRef.current) {
      playRef.current.style.top = indicator.style.top;
    }
  };

  useLayoutEffect(() => {
    if (!isNow || !columnRef.current || !playRef.current) return;

    const frame = requestAnimationFrame(syncPosition);
    const interval = window.setInterval(syncPosition, 10_000);
    const mutationObserver = new MutationObserver(syncPosition);
    mutationObserver.observe(columnRef.current, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncPosition);
      resizeObserver.observe(columnRef.current);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(interval);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    };
  }, [children, className, isNow, style, syncPosition]);

  return (
    <div className={className} ref={setRef} style={style}>
      {children}
      {isNow ? (
        <svg
          className="calendar-indicator-play-btn absolute cursor-pointer"
          data-testid="current-time-indicator-play"
          fill="none"
          height="16"
          onClick={(e) => {
            e.stopPropagation();
            onStartEntry?.();
          }}
          ref={playRef}
          style={{ pointerEvents: "all", left: "-7px", marginTop: "-6.5px" }}
          viewBox="0 0 36 36"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect fill="var(--track-accent)" height="36" rx="18" width="36" />
          <path
            d="M13 11.994c0-1.101.773-1.553 1.745-.997l10.51 6.005c.964.55.972 1.439 0 1.994l-10.51 6.007c-.964.55-1.745.102-1.745-.997V11.994z"
            fill="var(--track-canvas)"
          />
        </svg>
      ) : null}
    </div>
  );
});
