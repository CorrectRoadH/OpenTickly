import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { type ReactElement } from "react";

export const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});

function NotFoundPage(): ReactElement {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--track-canvas)] text-[var(--track-text)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-[64px] font-bold leading-none text-[var(--track-text-muted)]">404</p>
        <h1 className="text-[20px] font-semibold">Page not found</h1>
        <p className="max-w-[320px] text-[14px] leading-5 text-[var(--track-text-muted)]">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          className="mt-2 inline-flex h-9 items-center rounded-[6px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--track-accent-hover)]"
          to="/timer"
        >
          Go to Timer
        </Link>
      </div>
    </div>
  );
}
