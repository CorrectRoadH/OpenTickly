import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "react-router";
import { baseOptions } from "@/lib/layout.shared";
import Seo from "@/components/seo";
import {
  buildFaqSchema,
  buildOrganizationSchema,
  defaultDescription,
  resolveSiteUrl,
} from "@/lib/seo";

const faqItems = [
  {
    question: "What is OpenToggl?",
    answer:
      "OpenToggl is a free, private-first, AI-friendly alternative to Toggl that aims to preserve the same product surface without the same pricing, hosting, and rate-limit constraints.",
  },
  {
    question: "Can I self-host OpenToggl?",
    answer:
      "Yes. OpenToggl is built for self-hosting, so you can run time tracking on infrastructure you control instead of depending on a single hosted vendor.",
  },
  {
    question: "Why is OpenToggl better for AI and automation?",
    answer:
      "AI agents and automation need high-rate read and write access. OpenToggl is meant to be a better backend for that workload than a service constrained by tiny hourly limits.",
  },
];

export default function Home() {
  const siteUrl = resolveSiteUrl();

  return (
    <HomeLayout {...baseOptions()}>
      <Seo
        pathname="/"
        title="Free Private-First Toggl Alternative"
        description={defaultDescription}
        schema={[buildOrganizationSchema(siteUrl), buildFaqSchema(faqItems)]}
      />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12 md:px-6 md:py-16">
        <section className="landing-hero rounded-3xl border border-fd-border p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-fd-foreground md:text-6xl">
              OpenToggl
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-fd-muted-foreground md:text-lg">
              OpenToggl is a free, private-first, AI-friendly alternative to Toggl
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                className="rounded-full bg-fd-primary px-5 py-3 text-sm font-semibold text-fd-primary-foreground transition hover:opacity-90"
                href="https://track.opentoggl.com"
                rel="noreferrer"
                target="_blank"
              >
                Live Demo
              </a>
              <a
                className="rounded-full border border-fd-border bg-fd-secondary px-5 py-3 text-sm font-semibold text-fd-foreground transition hover:bg-[#1b2734]"
                href="https://github.com/CorrectRoadH/opentoggl"
                rel="noreferrer"
                target="_blank"
              >
                Github
              </a>
              <Link
                className="rounded-full border border-fd-border bg-fd-secondary px-5 py-3 text-sm font-semibold text-fd-foreground transition hover:bg-[#1b2734]"
                to="/docs"
              >
                Self-Hosting
              </Link>
              <Link
                className="rounded-full border border-fd-border bg-fd-secondary px-5 py-3 text-sm font-semibold text-fd-foreground transition hover:bg-[#1b2734]"
                to="https://github.com/CorrectRoadH/toggl-cli"
              >
                Toggl Cli
              </Link>
            </div>
            <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
              {[
                ["Costs less", "Stop paying premium SaaS pricing for basic time tracking."],
                [
                  "Stays private",
                  "Run it yourself and keep operational data on infrastructure you control.",
                ],
                [
                  "Works for agents",
                  "Give AI and automation the API throughput they actually need.",
                ],
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
            "Toggl-shaped workflow",
            "Private-first",
            "Free",
            "Built for AI agents",
            "Automation-friendly",
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
              body: "A serious Toggl alternative built to keep the same overall workflow without forcing you into the same vendor model.",
            },
            {
              title: "Why it exists",
              body: "Because Toggl is too expensive for many teams, too closed for private-first setups, and too rate-limited for AI-heavy usage.",
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
