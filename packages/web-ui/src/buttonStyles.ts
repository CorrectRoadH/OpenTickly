import type { ButtonOverrides } from "baseui/button";

export type AppButtonTone = "primary" | "secondary" | "ghost" | "destructive";
export type AppButtonSize = "default" | "sm";

const baseButtonClassName =
  "inline-flex items-center justify-center gap-1 rounded-[8px] border font-semibold transition-[transform,box-shadow,background-color,border-color] duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:translate-y-0";

const sizeClassNames: Record<AppButtonSize, string> = {
  default: "h-9 px-4 text-[12px]",
  sm: "h-7 px-2.5 text-[11px]",
};

const buttonToneClassNames: Record<AppButtonTone, string> = {
  primary:
    "border-[var(--track-button)] bg-[var(--track-button)] text-[var(--track-button-text)] shadow-[var(--track-depth-accent-shadow)] hover:-translate-y-px hover:shadow-[0_3px_0_0_var(--track-accent-strong)] active:translate-y-px active:shadow-[var(--track-depth-shadow-active)]",
  secondary:
    "border-[var(--track-border)] bg-transparent text-[var(--track-text-muted)] shadow-[var(--track-depth-shadow-rest)] hover:-translate-y-px hover:shadow-[0_3px_0_0_var(--track-depth-border)] hover:border-[var(--track-text-muted)] hover:text-white active:translate-y-px active:shadow-[var(--track-depth-shadow-active)]",
  ghost:
    "border-transparent bg-transparent text-[var(--track-text-muted)] hover:bg-[var(--track-row-hover)] active:translate-y-px",
  destructive:
    "border-rose-600 bg-rose-600 text-white shadow-[0_2px_0_0_#881337] hover:-translate-y-px hover:shadow-[0_3px_0_0_#881337] active:translate-y-px active:shadow-[var(--track-depth-shadow-active)]",
};

const buttonToneStyles: Record<AppButtonTone, Record<string, string | number>> = {
  primary: {
    backgroundColor: "var(--track-button)",
    borderColor: "var(--track-button)",
    color: "var(--track-button-text)",
  },
  secondary: {
    backgroundColor: "transparent",
    borderColor: "var(--track-border)",
    color: "var(--track-text-muted)",
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    color: "var(--track-text-muted)",
  },
  destructive: {
    backgroundColor: "#e11d48",
    borderColor: "#e11d48",
    color: "#ffffff",
  },
};

const sizeStyles: Record<AppButtonSize, Record<string, string | number>> = {
  default: {
    minHeight: "36px",
    paddingLeft: "16px",
    paddingRight: "16px",
    fontSize: "12px",
  },
  sm: {
    minHeight: "28px",
    paddingLeft: "10px",
    paddingRight: "10px",
    fontSize: "11px",
  },
};

export function getButtonClassName(
  tone: AppButtonTone,
  size: AppButtonSize = "default",
  className?: string,
): string {
  return [baseButtonClassName, sizeClassNames[size], buttonToneClassNames[tone], className]
    .filter(Boolean)
    .join(" ");
}

export function getButtonOverrides(
  tone: AppButtonTone,
  size: AppButtonSize = "default",
  overrides?: ButtonOverrides,
): ButtonOverrides {
  const baseButtonOverride = overrides?.BaseButton;
  const baseButtonStyle =
    typeof baseButtonOverride === "object" &&
    baseButtonOverride !== null &&
    "style" in baseButtonOverride &&
    typeof baseButtonOverride.style === "object" &&
    baseButtonOverride.style !== null
      ? baseButtonOverride.style
      : undefined;

  return {
    ...overrides,
    BaseButton: {
      ...(typeof baseButtonOverride === "object" ? baseButtonOverride : undefined),
      style: {
        borderRadius: "8px",
        fontWeight: 600,
        transitionProperty: "transform, box-shadow, background-color, border-color",
        transitionDuration: "var(--duration-fast)",
        transitionTimingFunction: "var(--ease-spring)",
        ...sizeStyles[size],
        ...buttonToneStyles[tone],
        ...baseButtonStyle,
      },
    },
  };
}
