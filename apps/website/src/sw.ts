/// <reference lib="webworker" />
// @ts-nocheck — compiled by vite-plugin-pwa via Rollup, not tsc
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { BackgroundSyncPlugin } from "workbox-background-sync";
import { createHandlerBoundToURL } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

// Take control immediately
void self.skipWaiting();
clientsClaim();

// Precache static assets (injected by vite-plugin-pwa)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback
const navigationHandler = createHandlerBoundToURL("index.html");
registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [
      /^\/api\//,
      /^\/healthz/,
      /^\/web\//,
      /^\/reports\//,
      /^\/insights\//,
      /^\/import\//,
      /^\/admin\//,
    ],
  }),
);

// ─── Runtime caching: GET API responses ───

const apiCacheExpiration = new ExpirationPlugin({
  maxEntries: 100,
  maxAgeSeconds: 24 * 60 * 60, // 24 hours
});

const shortCacheExpiration = new ExpirationPlugin({
  maxEntries: 50,
  maxAgeSeconds: 5 * 60, // 5 minutes
});

// User profile & preferences — long cache
registerRoute(
  ({ url }) => url.pathname === "/api/v9/me" || url.pathname === "/api/v9/me/preferences",
  new NetworkFirst({
    cacheName: "api-user",
    plugins: [apiCacheExpiration],
  }),
);

// Session
registerRoute(
  ({ url }) => url.pathname === "/web/v1/session",
  new NetworkFirst({
    cacheName: "api-session",
    plugins: [apiCacheExpiration],
  }),
);

// Time entries — short cache (data changes frequently)
registerRoute(
  ({ url }) =>
    url.pathname === "/api/v9/me/time_entries" ||
    url.pathname.startsWith("/api/v9/me/time_entries"),
  new NetworkFirst({
    cacheName: "api-time-entries",
    plugins: [shortCacheExpiration],
  }),
);

// Workspace resources (projects, tags, clients, tasks, favorites, goals)
registerRoute(
  ({ url }) => {
    const p = url.pathname;
    return /^\/api\/v9\/workspaces\/\d+\/(projects|tags|clients|tasks|favorites)/.test(p);
  },
  new NetworkFirst({
    cacheName: "api-workspace",
    plugins: [apiCacheExpiration],
  }),
);

// Organization
registerRoute(
  ({ url }) => /^\/api\/v9\/organizations\/\d+/.test(url.pathname),
  new NetworkFirst({
    cacheName: "api-organization",
    plugins: [apiCacheExpiration],
  }),
);

// Weekly report
registerRoute(
  ({ url }) =>
    url.pathname.includes("/reports/api/v3/") && url.pathname.includes("/weekly/time_entries"),
  new NetworkFirst({
    cacheName: "api-reports",
    plugins: [shortCacheExpiration],
  }),
);

// Goals
registerRoute(
  ({ url }) => /^\/api\/v9\/workspaces\/\d+\/goals/.test(url.pathname),
  new NetworkFirst({
    cacheName: "api-goals",
    plugins: [apiCacheExpiration],
  }),
);

// ─── Background Sync: queue offline mutations ───

const bgSyncPlugin = new BackgroundSyncPlugin("offline-mutations", {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
      } catch {
        // Put it back and stop processing
        await queue.unshiftRequest(entry);
        throw new Error("Replay failed, will retry later");
      }
    }
    // Notify clients that sync is complete
    const clients = await self.clients.matchAll({ type: "window" });
    for (const client of clients) {
      client.postMessage({ type: "BACKGROUND_SYNC_COMPLETE" });
    }
  },
});

// Queue POST/PUT/PATCH/DELETE to track API
// networkTimeoutSeconds ensures fast failure when offline so the UI
// gets an error quickly (triggering rollback) while BackgroundSyncPlugin
// queues the request for replay when connectivity returns.
const mutationMatcher = ({ url, request }: { url: URL; request: Request }) => {
  if (request.method === "GET") return false;
  const p = url.pathname;
  return p.startsWith("/api/v9/") || p.startsWith("/web/v1/");
};

const mutationStrategy = () =>
  new NetworkFirst({
    cacheName: "api-mutations",
    networkTimeoutSeconds: 3,
    plugins: [bgSyncPlugin],
  });

for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
  registerRoute(mutationMatcher, mutationStrategy(), method);
}
