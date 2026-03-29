import type { ReactNode } from "react";

export type AppButtonTone = "primary" | "secondary" | "ghost" | "destructive";
export type AppButtonSize = "default" | "sm";

type AppButtonProps = {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  size?: AppButtonSize;
  tone?: AppButtonTone;
  type?: "button" | "submit";
};

/* Outer shell: shows the shadow/depth color beneath the face */
const outerBase =
  "relative inline-flex rounded-[8px] border-[1.5px] text-center group disabled:opacity-50 disabled:cursor-not-allowed";

const outerTone: Record<AppButtonTone, string> = {
  primary: "bg-[var(--track-accent-strong)] border-[var(--track-accent-strong)]",
  secondary: "bg-[var(--track-depth-border)] border-[var(--track-border)]",
  ghost: "border-transparent bg-transparent",
  destructive: "bg-[#881337] border-[#881337]",
};

/* Inner face: the visible button surface, lifted up via translateY */
const innerBase =
  "flex items-center justify-center gap-1 rounded-[6px] border-[1.5px] font-semibold select-none mx-[-1.5px] transition-transform duration-[var(--duration-fast)]";

const innerTone: Record<AppButtonTone, string> = {
  primary:
    "bg-[var(--track-button)] text-white border-[var(--track-button)] translate-y-[-2px] hover:translate-y-[-3px] active:translate-y-[-1px] group-disabled:hover:!translate-y-[-2px]",
  secondary:
    "bg-[var(--track-surface)] text-[var(--track-text-muted)] border-[var(--track-border)] translate-y-[-2px] hover:translate-y-[-3px] hover:text-white active:translate-y-[-1px] group-disabled:hover:!translate-y-[-2px]",
  ghost:
    "bg-transparent text-[var(--track-text-muted)] border-transparent translate-y-0 hover:bg-[var(--track-row-hover)] active:translate-y-px",
  destructive:
    "bg-rose-600 text-white border-rose-600 translate-y-[-2px] hover:translate-y-[-3px] active:translate-y-[-1px] group-disabled:hover:!translate-y-[-2px]",
};

const innerSize: Record<AppButtonSize, string> = {
  default: "h-9 px-4 text-[12px]",
  sm: "h-7 px-2.5 text-[11px]",
};

export function AppButton({
  children,
  className = "",
  "data-testid": testId,
  disabled,
  onClick,
  size = "default",
  tone = "primary",
  type = "button",
}: AppButtonProps) {
  const isFlat = tone === "ghost";

  return (
    <button
      className={`${outerBase} ${outerTone[tone]} ${className}`}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      style={{ transitionTimingFunction: "var(--ease-spring)" }}
      type={type}
    >
      <span
        className={`${innerBase} ${innerTone[tone]} ${innerSize[size]} ${isFlat ? "" : "mb-[-2px]"}`}
      >
        {children}
      </span>
    </button>
  );
}
