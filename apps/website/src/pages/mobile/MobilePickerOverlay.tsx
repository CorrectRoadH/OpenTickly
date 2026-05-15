import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppInput, IconButton } from "@opentickly/web-ui";

import { Search, X } from "lucide-react";

export function MobilePickerOverlay({
  children,
  onClose,
  searchPlaceholder,
  testId,
  title,
}: {
  children: (search: string) => ReactElement;
  onClose: () => void;
  searchPlaceholder?: string;
  testId: string;
  title: string;
}): ReactElement {
  const { t } = useTranslation("mobile");
  const [search, setSearch] = useState("");
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--track-surface)] pb-[env(safe-area-inset-bottom)]"
      data-testid={testId}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--track-border)] px-2">
        <IconButton
          aria-label={t("closePickerLabel", { name: title.toLowerCase() })}
          className="size-11"
          onClick={onClose}
          size="lg"
        >
          <X className="size-5" />
        </IconButton>
        <span className="flex-1 text-[14px] font-semibold text-white">{title}</span>
      </div>
      <div className="border-b border-[var(--track-border)] px-4 py-2">
        <AppInput
          className="rounded-[8px] border"
          leadingIcon={<Search className="size-4" />}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder ?? t("searchPlaceholder", { name: title.toLowerCase() })}
          value={search}
        />
      </div>
      <div className="flex-1 overflow-y-auto">{children(search)}</div>
    </div>
  );
}
