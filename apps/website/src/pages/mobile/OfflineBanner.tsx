import { type ReactElement, useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

import { useOnlineStatusWithTransition } from "../../shared/hooks/useOnlineStatus.ts";

export function OfflineBanner(): ReactElement | null {
  const { isOnline, wasOffline } = useOnlineStatusWithTransition();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncedJustNow, setSyncedJustNow] = useState(false);

  // Listen for background sync completion from service worker
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "BACKGROUND_SYNC_COMPLETE") {
        setSyncedJustNow(true);
        setPendingCount(0);
        const timer = setTimeout(() => setSyncedJustNow(false), 3000);
        return () => clearTimeout(timer);
      }
    }
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, []);

  // Track pending mutations via fetch interception when offline
  useEffect(() => {
    if (isOnline) {
      setPendingCount(0);
      return;
    }

    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const request = new Request(...args);
      if (request.method !== "GET") {
        const url = new URL(request.url, location.origin);
        if (url.pathname.startsWith("/api/v9/") || url.pathname.startsWith("/web/v1/")) {
          setPendingCount((c) => c + 1);
        }
      }
      return origFetch(...args);
    };

    return () => {
      window.fetch = origFetch;
    };
  }, [isOnline]);

  // Synced toast
  if (syncedJustNow && isOnline) {
    return (
      <div className="flex items-center justify-center bg-emerald-600/90 px-4 py-2 text-[13px] font-medium text-white">
        离线操作已同步完成
      </div>
    );
  }

  // Reconnected toast
  if (isOnline && wasOffline) {
    return (
      <div className="flex items-center justify-center bg-emerald-600/90 px-4 py-2 text-[13px] font-medium text-white">
        已恢复连接
      </div>
    );
  }

  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-600/90 px-4 py-2 text-[13px] font-medium text-white">
      <WifiOff className="size-4" />
      <span>
        你已离线 — 操作将在连网后自动同步
        {pendingCount > 0 ? `（${pendingCount} 项待同步）` : ""}
      </span>
    </div>
  );
}
