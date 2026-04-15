import { type ReactElement, useRef, useState } from "react";

import { PlayIcon, StopIcon } from "./icons.tsx";

type TimerActionButtonProps = {
  isRunning: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  onClick: () => void;
  size?: "xs" | "sm" | "md";
};

export function TimerActionButton({
  isRunning,
  ariaLabel,
  disabled,
  onClick,
  size = "md",
}: TimerActionButtonProps): ReactElement {
  const sizeClass = size === "xs" ? "size-9" : size === "sm" ? "size-10" : "size-[42px]";
  const iconClass = size === "xs" ? "size-4" : size === "sm" ? "size-4" : "size-5";
  // Brief local "pulse" so the user sees their tap registered even when the
  // optimistic cache flips `isRunning` before React paints. Clears after a tick.
  const [pulsing, setPulsing] = useState(false);
  const pulseTimeoutRef = useRef<number | null>(null);

  function handleClick() {
    if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current);
    setPulsing(true);
    pulseTimeoutRef.current = window.setTimeout(() => setPulsing(false), 240);
    onClick();
  }

  return (
    <button
      aria-label={ariaLabel ?? (isRunning ? "Stop timer" : "Start timer")}
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full text-white shadow-[var(--track-depth-accent-shadow)] transition-[transform,box-shadow] duration-[var(--duration-fast)] hover:-translate-y-[2px] hover:shadow-[var(--track-depth-accent-shadow-hover)] active:translate-y-[2px] active:shadow-[var(--track-depth-shadow-active)] ${
        pulsing ? "scale-90" : ""
      } ${isRunning ? "bg-[var(--track-danger-text)]" : "bg-[var(--track-accent)]"}`}
      data-icon={isRunning ? "stop" : "play"}
      data-testid="timer-action-button"
      disabled={disabled}
      onClick={handleClick}
      style={{ transitionTimingFunction: "var(--ease-spring)" }}
      type="button"
    >
      {isRunning ? <StopIcon className={iconClass} /> : <PlayIcon className={iconClass} />}
    </button>
  );
}
