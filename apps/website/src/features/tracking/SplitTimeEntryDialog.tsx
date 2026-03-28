import {
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

const STEP_SECONDS = 300; // 5-minute increments

type SplitTimeEntryDialogProps = {
  start: string;
  stop: string;
  onCancel: () => void;
  onConfirm: (splitAtMs: number) => void;
};

/**
 * Dialog to split a stopped time entry at a user-chosen point.
 * Two vertically stacked blocks show the resulting halves with proportional
 * heights. The divider line between them is draggable (pointer events) to
 * pick the split time. Matches the Toggl split dialog.
 */
export function SplitTimeEntryDialog({
  start,
  stop,
  onCancel,
  onConfirm,
}: SplitTimeEntryDialogProps): ReactElement {
  const startMs = useMemo(() => new Date(start).getTime(), [start]);
  const stopMs = useMemo(() => new Date(stop).getTime(), [stop]);
  const totalSeconds = Math.round((stopMs - startMs) / 1000);

  const midpointSeconds = Math.round(totalSeconds / 2 / STEP_SECONDS) * STEP_SECONDS;
  const [splitSeconds, setSplitSeconds] = useState(
    Math.max(STEP_SECONDS, Math.min(totalSeconds - STEP_SECONDS, midpointSeconds)),
  );

  const splitMs = startMs + splitSeconds * 1000;
  const firstDuration = splitSeconds;
  const secondDuration = totalSeconds - splitSeconds;
  const firstPercent = (splitSeconds / totalSeconds) * 100;

  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const onPointerMove = (me: globalThis.PointerEvent) => {
        const rect = container.getBoundingClientRect();
        const y = Math.max(0, Math.min(rect.height, me.clientY - rect.top));
        const ratio = y / rect.height;
        const rawSeconds = ratio * totalSeconds;
        const snapped = Math.round(rawSeconds / STEP_SECONDS) * STEP_SECONDS;
        setSplitSeconds(Math.max(STEP_SECONDS, Math.min(totalSeconds - STEP_SECONDS, snapped)));
      };

      const onPointerUp = () => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [totalSeconds],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(splitMs);
  }, [onConfirm, splitMs]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="split-time-entry-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div className="w-[360px] rounded-[16px] bg-[#2c2c2e] shadow-[0_24px_48px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <h2 className="text-[16px] font-semibold text-white">Split Time Entry</h2>
            <p className="mt-1 text-[13px] text-[#909096]">Choose the split time</p>
          </div>
          <button
            aria-label="Close"
            className="mt-0.5 flex size-6 items-center justify-center rounded-full text-[#909096] transition hover:bg-white/8 hover:text-white"
            onClick={onCancel}
            type="button"
          >
            <svg className="size-[7px]" fill="none" viewBox="0 0 7 7">
              <path
                d="M.5.5l6 6m0-6l-6 6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.2"
              />
            </svg>
          </button>
        </div>

        {/* Split visualization */}
        <div
          ref={containerRef}
          className="relative mx-6 mt-4 flex h-[260px] flex-col overflow-hidden rounded-[8px]"
        >
          {/* Top block */}
          <div
            className="flex flex-col justify-end bg-[#3a3a3e] p-3"
            style={{ flexBasis: `${firstPercent}%`, minHeight: 36 }}
          >
            <span className="text-[12px] leading-tight text-[#c9c9ce]">
              {formatDuration(firstDuration)} ({formatTime(startMs)} – {formatTime(splitMs)})
            </span>
          </div>
          {/* Bottom block */}
          <div
            className="flex flex-col justify-end bg-[#2a2a2e] p-3"
            style={{ flexBasis: `${100 - firstPercent}%`, minHeight: 36 }}
          >
            <span className="text-[12px] leading-tight text-[#c9c9ce]">
              {formatDuration(secondDuration)} ({formatTime(splitMs)} – {formatTime(stopMs)})
            </span>
          </div>

          {/* Draggable divider with handles */}
          <div
            className="absolute left-0 right-0 flex cursor-ns-resize items-center"
            onPointerDown={handlePointerDown}
            style={{ top: `calc(${firstPercent}% - 10px)` }}
          >
            <DragHandle />
            <div className="h-[2px] flex-1 bg-[#666] shadow-[0_0_0_2px_#1b1b1b]" />
            <DragHandle />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 px-6 py-5">
          <button
            className="rounded-[8px] border border-[#4a4a4e] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-white/5"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-[8px] bg-[#e57cd8] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#d06cc8]"
            data-testid="split-confirm-button"
            onClick={handleConfirm}
            type="button"
          >
            Split
          </button>
        </div>
      </div>
    </div>
  );
}

function DragHandle(): ReactElement {
  return (
    <svg className="shrink-0 text-[#a4a4a4]" fill="currentColor" height="18" width="14">
      <rect rx="1" width="14" height="2" y="6" />
      <rect rx="1" width="14" height="2" y="10" />
      <path
        d="M7 2 5.3 3.9a.7.7 0 0 1-1.1 0 .9.9 0 0 1 0-1.2L6.5.2a.7.7 0 0 1 1 0l2.3 2.5a.9.9 0 0 1 0 1.2.7.7 0 0 1-1 0L7 2ZM7 16l1.7-1.9a.7.7 0 0 1 1.1 0 .9.9 0 0 1 0 1.2L7.5 17.8a.7.7 0 0 1-1 0l-2.3-2.5a.9.9 0 0 1 0-1.2.7.7 0 0 1 1 0L7 16Z"
        stroke="currentColor"
        strokeWidth="0.5"
      />
    </svg>
  );
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTime(ms: number): string {
  const date = new Date(ms);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${ampm}`;
}
