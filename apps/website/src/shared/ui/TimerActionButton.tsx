import type { ReactElement } from "react";

import { PlayIcon, StopIcon } from "./icons.tsx";

const baseClass =
  "inline-flex shrink-0 items-center justify-center rounded-full border-2 text-white outline-none transition-all duration-[var(--duration-press)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--track-accent)] hover:-translate-y-px active:translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none";

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
  const stateClass = isRunning
    ? "border-[var(--track-danger-text)] bg-[var(--track-danger-text)] shadow-[var(--track-depth-destructive-shadow)] hover:shadow-[var(--track-depth-destructive-shadow-hover)] active:shadow-[var(--track-depth-destructive-shadow-active)]"
    : "border-[var(--track-accent)] bg-[var(--track-accent)] shadow-[var(--track-depth-accent-shadow)] hover:shadow-[var(--track-depth-accent-shadow-hover)] active:shadow-[var(--track-depth-accent-shadow-active)]";

  return (
    <button
      aria-label={ariaLabel ?? (isRunning ? "Stop timer" : "Start timer")}
      className={`${baseClass} ${stateClass} ${sizeClass}`}
      data-icon={isRunning ? "stop" : "play"}
      data-testid="timer-action-button"
      disabled={disabled}
      onClick={onClick}
      style={{ transitionTimingFunction: "var(--ease-press)" }}
      type="button"
    >
      {isRunning ? <StopIcon className={iconClass} /> : <PlayIcon className={iconClass} />}
    </button>
  );
}
