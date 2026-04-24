import type { Route } from "./+types/not-found";
import { AppLinkButton, SurfaceCard } from "@opentickly/web-ui";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Page Not Found | OpenTickly" },
    {
      name: "description",
      content:
        "The page you are looking for does not exist. Return to the OpenTickly documentation or homepage.",
    },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export default function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-8"
      >
        <SurfaceCard className="w-full space-y-4 p-6 text-center">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-accent-text)]">
              Missing page
            </p>
            <h1 className="text-[20px] font-semibold text-[var(--track-text)]">Not Found</h1>
            <p className="text-[14px] leading-6 text-[var(--track-text-muted)]">
              This page could not be found.
            </p>
          </div>
          <div className="flex justify-center">
            <AppLinkButton href="/docs" variant="secondary">
              Back to Docs
            </AppLinkButton>
          </div>
        </SurfaceCard>
      </main>
    </HomeLayout>
  );
}
