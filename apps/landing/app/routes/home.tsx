import type { Route } from "./+types/home";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "react-router";
import { baseOptions } from "@/lib/layout.shared";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "OpenToggl | Open Source Time Tracking Platform" },
    {
      name: "description",
      content:
        "OpenToggl is an open source time tracking platform shaped by the public Toggl product surface, with Track, Reports, Webhooks, import tooling, and self-hosting.",
    },
  ];
}

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12 md:px-6 md:py-16">
        <section className="landing-hero rounded-3xl border border-fd-border p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex rounded-full border border-fd-border bg-white/3 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-fd-muted-foreground">
              Open source. Self-hostable. Toggl-shaped.
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-fd-foreground md:text-6xl">
              OpenToggl is the open source time tracking platform built from the public Toggl
              surface.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-fd-muted-foreground md:text-lg">
              It covers Track API v9, Reports API v3, Webhooks API v1, the web product surface,
              Toggl export import, and a self-hosted runtime you can inspect, run, and extend.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                className="rounded-full bg-fd-primary px-5 py-3 text-sm font-semibold text-fd-primary-foreground transition hover:opacity-90"
                href="https://github.com/CorrectRoadH/opentoggl"
                rel="noreferrer"
                target="_blank"
              >
                View GitHub
              </a>
              <Link
                className="rounded-full border border-fd-border bg-fd-secondary px-5 py-3 text-sm font-semibold text-fd-foreground transition hover:bg-[#1b2734]"
                to="/docs"
              >
                Read Docs
              </Link>
            </div>
            <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
              {[
                ["Contract-first", "Public API and product surface define the target."],
                ["Runs self-hosted", "Source, runtime, and deployment path live in the repo."],
                ["Imports Toggl data", "Bring existing exports into the same platform surface."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-fd-border bg-white/3 p-4">
                  <p className="text-sm font-semibold text-fd-foreground">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-fd-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Track API v9",
            "Reports API v3",
            "Webhooks API v1",
            "Web UI",
            "Toggl import",
            "Self-hosting",
          ].map((item) => (
            <div
              key={item}
              className="landing-capability rounded-2xl border border-fd-border px-5 py-4 text-sm font-medium text-fd-foreground shadow-sm"
            >
              {item}
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "What is OpenToggl?",
              body: "A direct implementation target for the current public Toggl product surface, not a vague “similar to Toggl” clone.",
            },
            {
              title: "Why it exists",
              body: "To give teams an auditable, open codebase for tracking, reports, and webhooks without inventing a parallel business model first.",
            },
            {
              title: "Why self-host",
              body: "You control deployment, data, and upgrades while keeping the same public contract as the hosted product surface.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="landing-card rounded-2xl border border-fd-border p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-fd-muted-foreground">{item.body}</p>
            </article>
          ))}
        </section>
      </main>
    </HomeLayout>
  );
}
