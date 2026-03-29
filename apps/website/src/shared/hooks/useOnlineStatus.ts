import { useEffect, useState, useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns { isOnline, wasOffline } where wasOffline stays true for 2s
 * after coming back online, useful for showing "reconnected" banners.
 */
export function useOnlineStatusWithTransition(): {
  isOnline: boolean;
  wasOffline: boolean;
} {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      const timer = setTimeout(() => setWasOffline(false), 2000);
      return () => clearTimeout(timer);
    }
    if (!isOnline) {
      setWasOffline(true);
    }
  }, [isOnline, wasOffline]);

  return { isOnline, wasOffline };
}
