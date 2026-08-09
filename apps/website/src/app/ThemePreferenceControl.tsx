import { Monitor, Moon, Sun } from "lucide-react";
import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { useTheme } from "./theme-context.tsx";
import { type ThemePreference } from "./theme-runtime.ts";

const options = [
  { icon: Monitor, labelKey: "themeSystem", value: "system" },
  { icon: Sun, labelKey: "themeLight", value: "light" },
  { icon: Moon, labelKey: "themeDark", value: "dark" },
] as const;

export function ThemePreferenceControl(): ReactElement {
  const { t } = useTranslation("appShell");
  const { preference, setPreference } = useTheme();

  return (
    <div className="px-2.5 py-2" role="group" aria-label={t("appearance")}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        {t("appearance")}
      </p>
      <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-[var(--track-control-surface-muted)] p-1">
        {options.map(({ icon: Icon, labelKey, value }) => {
          const active = preference === value;
          return (
            <button
              aria-pressed={active}
              className={`flex items-center justify-center gap-1.5 rounded-[7px] px-2 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-[var(--track-surface-raised)] text-[var(--track-text)] shadow-[var(--track-shadow-subtle)]"
                  : "text-[var(--track-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-[var(--track-text)]"
              }`}
              key={value}
              onClick={() => setPreference(value satisfies ThemePreference)}
              type="button"
            >
              <Icon className="size-3.5" />
              <span>{t(labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
