import { useTranslation } from "react-i18next";
import { type ReactElement, useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISSED_KEY = "pwa-install-banner-dismissed";

type Platform = "ios" | "android" | null;

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export function PwaInstallBanner(): ReactElement | null {
  const { t } = useTranslation("mobile");
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const p = detectPlatform();
    if (!p) return;
    setPlatform(p);
    setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!visible || !platform) return null;

  return (
    <div className="flex items-start gap-3 bg-[var(--track-accent)]/15 px-4 py-3">
      <div className="min-w-0 flex-1 text-[13px] leading-snug text-[var(--track-text)]">
        {platform === "ios" ? <p>{t("pwaIos")}</p> : <p>{t("pwaAndroid")}</p>}
      </div>
      <button
        aria-label={t("closeBanner")}
        className="-my-1 flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--track-text-muted)] transition active:bg-white/5"
        onClick={dismiss}
        type="button"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
