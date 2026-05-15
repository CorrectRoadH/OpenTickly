import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export type AppInputSize = "default" | "sm";

type AppInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  className?: string;
  inputClassName?: string;
  leadingIcon?: ReactNode;
  size?: AppInputSize;
};

const wrapperBase =
  "flex items-center gap-2 rounded-[18px] border-2 border-[var(--track-border-input)] bg-[var(--track-input-bg)] shadow-[var(--track-depth-shadow-rest)] transition-[border-color,background-color,box-shadow,transform] duration-[var(--duration-normal)] focus-within:-translate-y-px focus-within:border-[var(--track-accent-border)] focus-within:ring-1 focus-within:ring-[var(--track-accent-outline)] focus-within:shadow-[var(--track-depth-shadow-hover)]";

const wrapperSizeClass: Record<AppInputSize, string> = {
  default: "h-10 px-4",
  sm: "h-8 px-3",
};

const inputSizeClass: Record<AppInputSize, string> = {
  default: "text-[14px]",
  sm: "text-[12px]",
};

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(function AppInput(
  { className = "", inputClassName = "", leadingIcon, size = "default", ...props },
  ref,
) {
  return (
    <label className={`${wrapperBase} ${wrapperSizeClass[size]} ${className}`.trim()}>
      {leadingIcon ? (
        <span className="shrink-0 text-[var(--track-control-placeholder)]">{leadingIcon}</span>
      ) : null}
      <input
        {...props}
        className={`w-full min-w-0 bg-transparent text-white outline-none placeholder:text-[var(--track-control-placeholder)] ${inputSizeClass[size]} ${inputClassName}`.trim()}
        ref={ref}
      />
    </label>
  );
});
