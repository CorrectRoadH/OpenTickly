import type { ReactElement } from "react";

import { PlayIcon, StopIcon } from "./icons.tsx";

type TimerActionButtonProps = {
  isRunning: boolean;
  disabled?: boolean;
  onClick: () => void;
  size?: "sm" | "md";
};

export function TimerActionButton({
  isRunning,
  disabled,
  onClick,
  size = "md",
}: TimerActionButtonProps): ReactElement {
  const sizeClass = size === "sm" ? "size-10" : "size-[42px]";
  const iconClass = size === "sm" ? "size-4" : "size-5";

  return (
    <button
      aria-label={isRunning ? "Stop timer" : "Start timer"}
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full text-white shadow-[var(--track-depth-accent-shadow)] transition-[transform,box-shadow] duration-[var(--duration-fast)] hover:-translate-y-[2px] hover:shadow-[var(--track-depth-accent-shadow-hover)] active:translate-y-[2px] active:shadow-[var(--track-depth-shadow-active)] ${
        isRunning ? "bg-[var(--track-danger-text)]" : "bg-[var(--track-accent)]"
      }`}
      data-icon={isRunning ? "stop" : "play"}
      data-testid="timer-action-button"
      disabled={disabled}
      onClick={onClick}
      style={{ transitionTimingFunction: "var(--ease-spring)" }}
      type="button"
    >
      {isRunning ? <StopIcon className={iconClass} /> : <PlayIcon className={iconClass} />}
    </button>
  );
}
