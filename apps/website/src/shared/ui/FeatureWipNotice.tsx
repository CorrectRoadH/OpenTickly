import { Construction } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type FeatureWipNoticeProps = {
  description: string;
  icon?: ReactNode;
  noticeLabel?: string;
  title: string;
};

export function FeatureWipNotice({
  description,
  icon,
  noticeLabel,
  title,
}: FeatureWipNoticeProps): ReactElement {
  const { t } = useTranslation("invoices");

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-[var(--track-state-neutral-surface)]">
        {icon ?? (
          <Construction
            aria-hidden="true"
            className="size-6 text-[var(--track-text-muted)]"
            strokeWidth={1.7}
          />
        )}
      </div>
      <h3 className="text-[14px] font-semibold text-white">{title}</h3>
      <p className="max-w-[420px] text-[12px] leading-5 text-[var(--track-text-muted)]">
        {description}
      </p>
      <span className="mt-1 inline-flex rounded-full border border-[var(--track-border)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--track-text-muted)]">
        {noticeLabel ?? t("comingSoon")}
      </span>
    </div>
  );
}
