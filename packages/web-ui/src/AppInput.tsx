import type { InputHTMLAttributes, ReactNode } from "react";

export type AppInputSize = "default" | "sm";

type AppInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  className?: string;
  inputClassName?: string;
  leadingIcon?: ReactNode;
  size?: AppInputSize;
};

const wrapperBase =
  "flex items-center gap-2 rounded-[8px] border border-[var(--track-border-input)] bg-[var(--track-input-bg)] shadow-[0_1px_0_0_var(--track-depth-border)] transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)] focus-within:border-[var(--track-accent-border)] focus-within:ring-1 focus-within:ring-[var(--track-accent-outline)]";

const wrapperSizeClass: Record<AppInputSize, string> = {
  default: "h-9 px-3",
  sm: "h-8 px-2.5",
};

const inputSizeClass: Record<AppInputSize, string> = {
  default: "text-[14px]",
  sm: "text-[12px]",
};

export function AppInput({
  className = "",
  inputClassName = "",
  leadingIcon,
  size = "default",
  ...props
}: AppInputProps) {
  return (
    <label className={`${wrapperBase} ${wrapperSizeClass[size]} ${className}`.trim()}>
      {leadingIcon ? (
        <span className="shrink-0 text-[var(--track-control-placeholder)]">{leadingIcon}</span>
      ) : null}
      <input
        {...props}
        className={`w-full min-w-0 bg-transparent text-white outline-none placeholder:text-[var(--track-control-placeholder)] ${inputSizeClass[size]} ${inputClassName}`.trim()}
      />
    </label>
  );
}
