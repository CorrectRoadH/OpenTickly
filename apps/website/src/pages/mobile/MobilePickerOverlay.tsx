import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import { Search, X } from "lucide-react";

export function MobilePickerOverlay({
  children,
  onClose,
  testId,
  title,
}: {
  children: (search: string) => ReactElement;
  onClose: () => void;
  testId: string;
  title: string;
}): ReactElement {
  const { t } = useTranslation("mobile");
  const [search, setSearch] = useState("");
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--track-surface)]"
      data-testid={testId}
    >
      <div className="flex h-[52px] items-center gap-3 border-b border-[var(--track-border)] px-4">
        <button
          aria-label={t("closePickerLabel", { name: title.toLowerCase() })}
          className="shrink-0 text-[var(--track-text-muted)]"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>
        <span className="flex-1 text-[14px] font-semibold text-white">{title}</span>
      </div>
      <div className="border-b border-[var(--track-border)] px-4 py-2">
        <div className="flex items-center gap-2 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2">
          <Search className="size-4 shrink-0 text-[var(--track-text-muted)]" />
          <input
            className="min-w-0 flex-1 bg-transparent text-[14px] text-white placeholder-[var(--track-text-muted)] outline-none"
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder", { name: title.toLowerCase() })}
            value={search}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">{children(search)}</div>
    </div>
  );
}
