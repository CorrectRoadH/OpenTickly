import { HomeLayout } from "fumadocs-ui/layouts/home";
import { ArrowUpRight, Github, Terminal } from "lucide-react";
import { Link } from "react-router";
import HomeHeroScreenshots from "@/components/home-hero-screenshots";
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
    question: "Does OpenToggl work on mobile?",
    answer:
      "Yes. OpenToggl is a Progressive Web App. On iOS and Android, you can add it to your home screen and use it like a native app with full-screen mode and fast startup — no app store needed.",
  },
  {
    question: "Why is OpenToggl better for AI and automation?",
    answer:
      "AI agents and automation need high-rate read and write access. OpenToggl is meant to be a better backend for that workload than a service constrained by tiny hourly limits.",
  },
];

const heroHighlights = [
  ["Lower cost", "Avoid premium SaaS pricing for a workflow your team already knows."],
  [
    "AI-friendly",
    "No rate-limit ceiling. Built for agents, automations, and high-frequency API access.",
  ],
  [
    "Mobile-ready PWA",
    "Add to your home screen and use it like a native app — no app store needed.",
  ],
];

const featureCards = [
  {
    title: "Toggl-shaped surface",
    body: "Track, reports, and webhooks stay aligned with the public product surface teams already understand.",
  },
  {
    title: "Operator-friendly deploy",
    body: "The docs include a straightforward Docker Compose baseline plus health and readiness verification.",
  },
  {
    title: "Better for AI workflows",
    body: "Private infrastructure and higher-throughput APIs make automation less fragile and less constrained.",
  },
];

export default function Home() {
  const siteUrl = resolveSiteUrl();

  return (
    <HomeLayout {...baseOptions()}>
      <Seo
        pathname="/"
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
                className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-secondary px-5 py-3 text-sm font-semibold text-fd-foreground transition hover:bg-[#1b2734]"
                href="https://github.com/CorrectRoadH/opentoggl"
                rel="noreferrer"
                target="_blank"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                GitHub
              </a>
              <Link
                className="rounded-full border border-fd-border bg-fd-secondary px-5 py-3 text-sm font-semibold text-fd-foreground transition hover:bg-[#1b2734]"
                to="/docs/self-hosting"
              >
                Self-Hosting
              </Link>
              <a
                className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-secondary px-5 py-3 text-sm font-semibold text-fd-foreground transition hover:bg-[#1b2734]"
                href="https://github.com/CorrectRoadH/toggl-cli"
                rel="noreferrer"
                target="_blank"
              >
                <Terminal className="h-4 w-4" aria-hidden="true" />
                Toggl CLI
                <ArrowUpRight className="h-4 w-4 opacity-70" aria-hidden="true" />
              </a>
            </div>
            <HomeHeroScreenshots />
            <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
              {heroHighlights.map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-fd-border bg-white/3 p-4">
                  <p className="text-sm font-semibold text-fd-foreground">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-fd-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {featureCards.map((item) => (
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
