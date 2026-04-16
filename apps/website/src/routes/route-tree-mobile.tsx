import { Navigate, createRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { Suspense, type ReactNode } from "react";

import { LanguageSync } from "../app/AuthenticatedAppFrame.tsx";
import { useSessionBootstrapQuery } from "../shared/query/web-shell.ts";
import { SessionProvider } from "../shared/session/session-context.tsx";
import { rootRoute } from "./root-route.tsx";
import {
  isSessionAccessDenied,
  pageSpinner,
  SessionExpiredRedirect,
  SessionPendingPanel,
  SessionUnavailablePanel,
} from "./route-tree-shared.tsx";
import {
  MobileCalendarPage,
  MobileMePage,
  MobileReportPage,
  MobileShell,
  MobileTimerPage,
} from "./route-tree-lazy-pages.tsx";

// Fallback for the per-tab Suspense boundaries. Sized to the tab content area
// (NOT full screen) so the composer bar and bottom nav stay visible while the
// tab page mounts. Since the four tab pages share a Vite chunk with
// MobileShell, this fallback almost never renders in practice — it's a
// defensive visible state for any microtask-level suspend or for future
// tab-level Suspense queries. Full-screen `pageSpinner` would hide the shell
// chrome and be visually jarring here.
const mobileTabSpinner = (
  <div className="flex h-full items-center justify-center">
    <LoaderCircle className="size-6 animate-spin text-[var(--track-text-muted)]" />
  </div>
);

/* ---------- mobile layout ---------- */

export const mobileLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/m",
  component: MobileLayoutRouteComponent,
});

export const mobileIndexRoute = createRoute({
  getParentRoute: () => mobileLayoutRoute,
  path: "/",
  component: () => <Navigate replace to="/m/timer" />,
});

export const mobileTimerRoute = createRoute({
  getParentRoute: () => mobileLayoutRoute,
  path: "/timer",
  component: MobileTimerRouteComponent,
});

export const mobileCalendarRoute = createRoute({
  getParentRoute: () => mobileLayoutRoute,
  path: "/calendar",
  component: MobileCalendarRouteComponent,
});

export const mobileReportRoute = createRoute({
  getParentRoute: () => mobileLayoutRoute,
  path: "/report",
  component: MobileReportRouteComponent,
});

export const mobileMeRoute = createRoute({
  getParentRoute: () => mobileLayoutRoute,
  path: "/me",
  component: MobileMeRouteComponent,
});

/* ---------- route components ---------- */

function MobileLayoutRouteComponent() {
  if (typeof window !== "undefined" && window.innerWidth >= 768) {
    return <Navigate replace to="/timer" />;
  }

  return (
    <MobileProtectedBoundary>
      <Suspense fallback={pageSpinner}>
        <MobileShell />
      </Suspense>
    </MobileProtectedBoundary>
  );
}

function MobileProtectedBoundary({ children }: { children: ReactNode }) {
  const sessionQuery = useSessionBootstrapQuery();

  if (sessionQuery.isPending) {
    return <SessionPendingPanel />;
  }

  if (isSessionAccessDenied(sessionQuery.error)) {
    return <SessionExpiredRedirect />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <SessionUnavailablePanel />;
  }

  return (
    <SessionProvider sessionBootstrap={sessionQuery.data}>
      <LanguageSync>{children}</LanguageSync>
    </SessionProvider>
  );
}

function MobileTimerRouteComponent() {
  return (
    <Suspense fallback={mobileTabSpinner}>
      <MobileTimerPage />
    </Suspense>
  );
}

function MobileCalendarRouteComponent() {
  return (
    <Suspense fallback={mobileTabSpinner}>
      <MobileCalendarPage />
    </Suspense>
  );
}

function MobileReportRouteComponent() {
  return (
    <Suspense fallback={mobileTabSpinner}>
      <MobileReportPage />
    </Suspense>
  );
}

function MobileMeRouteComponent() {
  return (
    <Suspense fallback={mobileTabSpinner}>
      <MobileMePage />
    </Suspense>
  );
}
