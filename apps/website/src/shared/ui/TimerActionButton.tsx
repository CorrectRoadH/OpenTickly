import type { ReactElement } from "react";

import { PlayIcon, StopIcon } from "./icons.tsx";

const interactionClass =
  "relative overflow-hidden transition-[transform,box-shadow,background-color] duration-150 before:pointer-events-none before:absolute before:inset-[3px] before:rounded-full before:bg-white/20 before:opacity-0 before:transition-opacity before:duration-75 hover:-translate-y-[3px] active:translate-y-[3px] active:before:opacity-100 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none motion-reduce:transition-none motion-reduce:before:transition-none";

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
    ? "bg-[var(--track-danger-text)] shadow-[var(--track-depth-destructive-shadow)] hover:shadow-[var(--track-depth-destructive-shadow-hover)] active:shadow-[0_1px_0_0_#881337]"
    : "bg-[var(--track-accent)] shadow-[var(--track-depth-accent-shadow)] hover:shadow-[var(--track-depth-accent-shadow-hover)] active:shadow-[0_1px_0_0_var(--track-accent-strong)]";

  return (
    <button
      aria-label={ariaLabel ?? (isRunning ? "Stop timer" : "Start timer")}
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full text-white ${interactionClass} ${stateClass}`}
      data-icon={isRunning ? "stop" : "play"}
      data-testid="timer-action-button"
      disabled={disabled}
      onClick={onClick}
      style={{ transitionTimingFunction: "var(--ease-spring)" }}
      type="button"
    >
      {isRunning ? (
        <StopIcon className={`relative z-10 ${iconClass}`} />
      ) : (
        <PlayIcon className={`relative z-10 ${iconClass}`} />
      )}
    </button>
  );
}
