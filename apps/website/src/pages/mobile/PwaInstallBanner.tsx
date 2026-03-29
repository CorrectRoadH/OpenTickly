import { type ReactElement, useCallback, useEffect, useState } from "react";
import { Share, X } from "lucide-react";

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

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  }, []);

  if (!visible || !platform) return null;

  return (
    <div className="flex items-start gap-3 bg-[var(--track-accent)]/15 px-4 py-3">
      <div className="min-w-0 flex-1 text-[13px] leading-snug text-[var(--track-text)]">
        {platform === "ios" ? (
          <p>
            此应用支持离线使用。点击底部
            <span className="inline-flex translate-y-[2px] px-1">
              <Share className="size-4 text-[var(--track-accent)]" />
            </span>
            分享按钮，选择「添加到主屏幕」即可像 App 一样使用。
          </p>
        ) : (
          <p>
            此应用支持离线使用。点击浏览器菜单中的「添加到主屏幕」或「安装应用」，即可像 App
            一样使用。
          </p>
        )}
      </div>
      <button
        aria-label="关闭提示"
        className="shrink-0 p-1 text-[var(--track-text-muted)]"
        onClick={dismiss}
        type="button"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
