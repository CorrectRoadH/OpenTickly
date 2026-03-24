import type { ButtonOverrides } from "baseui/button";

export type AppButtonTone = "primary" | "secondary";

const baseButtonClassName =
  "inline-flex h-9 items-center justify-center gap-1 rounded-[8px] border px-4 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const buttonToneClassNames: Record<AppButtonTone, string> = {
  primary:
    "border-[var(--track-button)] bg-[var(--track-button)] text-[var(--track-button-text)] hover:brightness-[0.98]",
  secondary:
    "border-[var(--track-border)] bg-transparent text-[var(--track-text-muted)] hover:border-[var(--track-text-muted)] hover:text-white",
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
};

export function getButtonClassName(tone: AppButtonTone, className?: string): string {
  return [baseButtonClassName, buttonToneClassNames[tone], className].filter(Boolean).join(" ");
}

export function getButtonOverrides(
  tone: AppButtonTone,
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
        minHeight: "36px",
        borderRadius: "8px",
        fontWeight: 600,
        paddingLeft: "16px",
        paddingRight: "16px",
        ...buttonToneStyles[tone],
        ...baseButtonStyle,
      },
    },
  };
}
