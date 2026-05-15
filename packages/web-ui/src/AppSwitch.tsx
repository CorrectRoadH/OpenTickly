import { type ReactNode, useCallback, useState } from "react";

export type AppSwitchSize = "sm" | "md";

type AppSwitchProps = {
  "aria-label": string;
  checked?: boolean;
  checkedChildren?: ReactNode;
  className?: string;
  "data-testid"?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onChange?: (checked: boolean) => void;
  size?: AppSwitchSize;
  uncheckedChildren?: ReactNode;
};

const sizeClass: Record<AppSwitchSize, string> = {
  md: "h-7 w-[52px]",
  sm: "h-5 w-[38px]",
};

const handleClass: Record<AppSwitchSize, string> = {
  md: "left-[3px] top-1/2 size-[22px] -translate-y-1/2 border-[2.5px] shadow-[0_3px_0_0_var(--track-control-border)] data-[checked=true]:translate-x-[24px] data-[checked=true]:shadow-[0_3px_0_0_var(--track-accent-strong)]",
  sm: "left-[2px] top-1/2 size-4 -translate-y-1/2 border-2 shadow-[0_2px_0_0_var(--track-control-border)] data-[checked=true]:translate-x-[18px] data-[checked=true]:shadow-[0_2px_0_0_var(--track-accent-strong)]",
};

const innerClass: Record<AppSwitchSize, string> = {
  md: "px-2 pl-7 text-[11px] data-[checked=true]:pl-2 data-[checked=true]:pr-7",
  sm: "px-1.5 pl-5 text-[9px] data-[checked=true]:pl-1.5 data-[checked=true]:pr-5",
};

export function AppSwitch({
  "aria-label": ariaLabel,
  checked,
  checkedChildren,
  className = "",
  "data-testid": testId,
  defaultChecked = false,
  disabled = false,
  loading = false,
  onChange,
  size = "md",
  uncheckedChildren,
}: AppSwitchProps) {
  const [innerChecked, setInnerChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : innerChecked;

  const handleClick = useCallback(() => {
    if (disabled || loading) return;
    const next = !isChecked;
    if (!isControlled) setInnerChecked(next);
    onChange?.(next);
  }, [disabled, loading, isChecked, isControlled, onChange]);

  return (
    <button
      aria-checked={isChecked}
      aria-label={ariaLabel}
      className={`relative inline-flex shrink-0 items-center rounded-full border-[2.5px] p-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.22)] outline-none transition-all duration-[var(--duration-press)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--track-accent)] disabled:cursor-not-allowed disabled:opacity-50 ${
        isChecked
          ? "border-[var(--track-accent-strong)] bg-[var(--track-accent)] hover:border-[var(--track-accent-fill-hover)] hover:bg-[var(--track-accent-fill-hover)]"
          : "border-[var(--track-control-border)] bg-[var(--track-control-disabled-strong)] hover:border-[var(--track-control-border-hover)]"
      } ${sizeClass[size]} ${className}`.trim()}
      data-testid={testId}
      disabled={disabled}
      onClick={handleClick}
      role="switch"
      style={{ transitionTimingFunction: "var(--ease-press)" }}
      type="button"
    >
      <span
        className={`absolute flex items-center justify-center rounded-full border-[var(--track-control-border)] bg-[var(--track-state-neutral-surface)] transition-all duration-[var(--duration-press)] data-[checked=true]:border-[var(--track-accent-strong)] ${handleClass[size]}`}
        data-checked={isChecked}
        style={{ transitionTimingFunction: "var(--ease-press)" }}
      >
        {loading ? (
          <span
            className={`rounded-full border-2 border-current border-r-transparent ${
              size === "sm" ? "size-2.5" : "size-3"
            } animate-spin text-[var(--track-control-border)]`}
          />
        ) : null}
      </span>
      {checkedChildren || uncheckedChildren ? (
        <span
          className={`block whitespace-nowrap font-bold leading-none text-white transition-all duration-[var(--duration-press)] ${innerClass[size]}`}
          data-checked={isChecked}
          style={{ transitionTimingFunction: "var(--ease-press)" }}
        >
          {isChecked ? checkedChildren : uncheckedChildren}
        </span>
      ) : null}
    </button>
  );
}
