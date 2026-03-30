import { HomeLayout } from "fumadocs-ui/layouts/home";
import { ArrowUpRight, Github, Terminal } from "lucide-react";
import { Link, useParams } from "react-router";
import HomeHeroScreenshots from "@/components/home-hero-screenshots";
import { baseOptions } from "@/lib/layout.shared";
import Seo from "@/components/seo";
import {
  buildFaqSchema,
  buildOrganizationSchema,
  defaultDescription,
  resolveSiteUrl,
} from "@/lib/seo";
import { i18n } from "@/lib/i18n";

const t = {
  en: {
    subtitle: "OpenToggl is a free, private-first, AI-friendly alternative to Toggl",
    liveDemo: "Live Demo",
    selfHosting: "Self-Hosting",
    faq: [
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
    ],
    highlights: [
      ["Lower cost", "Avoid premium SaaS pricing for a workflow your team already knows."],
      [
        "AI-friendly",
        "No rate-limit ceiling. Built for agents, automations, and high-frequency API access.",
      ],
      [
        "Mobile-ready PWA",
        "Add to your home screen and use it like a native app — no app store needed.",
      ],
    ],
    features: [
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
    ],
  },
  zh: {
    subtitle: "OpenToggl 是一个免费、隐私优先、AI 友好的 Toggl 替代方案",
    liveDemo: "在线演示",
    selfHosting: "自托管",
    faq: [
      {
        question: "OpenToggl 是什么？",
        answer:
          "OpenToggl 是一个免费、隐私优先、AI 友好的 Toggl 替代方案，旨在保留相同的产品功能，同时避免定价、托管和速率限制方面的约束。",
      },
      {
        question: "可以自托管 OpenToggl 吗？",
        answer:
          "可以。OpenToggl 专为自托管设计，你可以在自己控制的基础设施上运行时间追踪，而不必依赖单一的托管供应商。",
      },
      {
        question: "OpenToggl 支持移动端吗？",
        answer:
          "支持。OpenToggl 是一个渐进式 Web 应用（PWA）。在 iOS 和 Android 上，你可以将它添加到主屏幕，像原生应用一样使用——无需应用商店。",
      },
      {
        question: "为什么 OpenToggl 更适合 AI 和自动化？",
        answer:
          "AI 代理和自动化需要高频率的读写访问。OpenToggl 旨在成为这类工作负载的更好后端，而不是受限于小时级速率限制的服务。",
      },
    ],
    highlights: [
      ["更低成本", "团队已经熟悉的工作流，不再需要支付高额 SaaS 费用。"],
      ["AI 友好", "没有速率限制上限。专为代理、自动化和高频 API 访问而构建。"],
      ["移动端 PWA", "添加到主屏幕，像原生应用一样使用——无需应用商店。"],
    ],
    features: [
      {
        title: "Toggl 兼容接口",
        body: "Track、Reports 和 Webhooks 与团队已经熟悉的公开产品接口保持一致。",
      },
      {
        title: "运维友好的部署",
        body: "文档提供了简单直接的 Docker Compose 基线以及健康和就绪性验证。",
      },
      {
        title: "更适合 AI 工作流",
        body: "私有基础设施和更高吞吐量的 API 使自动化更稳定、约束更少。",
      },
    ],
  },
};

export default function Home() {
  const params = useParams();
  const locale =
    params.lang && (i18n.languages as readonly string[]).includes(params.lang)
      ? (params.lang as "en" | "zh")
      : "en";
  const prefix = locale === i18n.defaultLanguage ? "" : `/${locale}`;
  const strings = t[locale];
  const siteUrl = resolveSiteUrl();

  return (
    <HomeLayout {...baseOptions(locale)}>
      <Seo
        pathname={`${prefix}/`}
        description={defaultDescription}
        schema={[buildOrganizationSchema(siteUrl), buildFaqSchema(strings.faq)]}
      />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12 md:px-6 md:py-16">
        <section className="landing-hero rounded-3xl border border-fd-border p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-fd-foreground md:text-6xl">
              OpenToggl
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-fd-muted-foreground md:text-lg">
              {strings.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                className="rounded-full bg-fd-primary px-5 py-3 text-sm font-semibold text-fd-primary-foreground transition hover:opacity-90"
                href="https://track.opentoggl.com"
                rel="noreferrer"
                target="_blank"
              >
                {strings.liveDemo}
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
                to={`${prefix}/docs/self-hosting`}
              >
                {strings.selfHosting}
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
              {strings.highlights.map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-fd-border bg-white/3 p-4">
                  <p className="text-sm font-semibold text-fd-foreground">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-fd-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {strings.features.map((item) => (
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
