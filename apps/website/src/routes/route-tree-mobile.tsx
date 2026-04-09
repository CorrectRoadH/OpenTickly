import { Navigate, createRoute } from "@tanstack/react-router";
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
      <LanguageSync />
      {children}
    </SessionProvider>
  );
}

function MobileTimerRouteComponent() {
  return (
    <Suspense fallback={null}>
      <MobileTimerPage />
    </Suspense>
  );
}

function MobileCalendarRouteComponent() {
  return (
    <Suspense fallback={null}>
      <MobileCalendarPage />
    </Suspense>
  );
}

function MobileReportRouteComponent() {
  return (
    <Suspense fallback={null}>
      <MobileReportPage />
    </Suspense>
  );
}

function MobileMeRouteComponent() {
  return (
    <Suspense fallback={null}>
      <MobileMePage />
    </Suspense>
  );
}
