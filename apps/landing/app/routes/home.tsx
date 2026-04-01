import { HomeLayout } from "fumadocs-ui/layouts/home";
import { AppLinkButton } from "@opentoggl/web-ui";
import {
  ArrowUpRight,
  Github,
  Server,
  Clock,
  BarChart3,
  Webhook,
  Lock,
  GitBranch,
} from "lucide-react";
import { useParams } from "react-router";

import HomeHeroScreenshots from "@/components/home-hero-screenshots";
import { baseOptions } from "@/lib/layout.shared";
import { homeContent } from "@/lib/home-content";
import Seo from "@/components/seo";
import {
  buildFaqSchema,
  buildOrganizationSchema,
  defaultDescription,
  resolveSiteUrl,
} from "@/lib/seo";
import { i18n } from "@/lib/i18n";

const featureIcons = [Clock, BarChart3, Webhook, Server, Lock, GitBranch];

export default function Home() {
  const params = useParams();
  const locale =
    params.lang && (i18n.languages as readonly string[]).includes(params.lang)
      ? (params.lang as keyof typeof homeContent)
      : "en";
  const prefix = locale === i18n.defaultLanguage ? "" : `/${locale}`;
  const strings = homeContent[locale];
  const siteUrl = resolveSiteUrl();

  return (
    <HomeLayout {...baseOptions(locale)}>
      <Seo
        pathname={`${prefix}/`}
        description={defaultDescription}
        schema={[buildOrganizationSchema(siteUrl), buildFaqSchema([...strings.faq])]}
      />

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-12 md:px-6 md:pt-24 md:pb-16">
        <div className="max-w-3xl">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--track-accent-text)]">
            {strings.hero.eyebrow}
          </p>
          <h1 className="mb-6 text-[36px] font-semibold leading-[1.2] tracking-[-0.02em] text-white md:text-[48px]">
            {strings.hero.title}
          </h1>
          <p className="mb-8 max-w-xl text-[16px] leading-7 text-[var(--track-text-muted)]">
            {strings.hero.body}
          </p>
          <div className="flex flex-wrap gap-3">
            <AppLinkButton href="https://track.opentoggl.com" target="_blank">
              {strings.hero.ctas.liveDemo}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </AppLinkButton>
            <AppLinkButton
              href="https://github.com/CorrectRoadH/opentoggl"
              target="_blank"
              variant="secondary"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              {strings.hero.ctas.github}
            </AppLinkButton>
            <AppLinkButton href={`${prefix}/docs/self-hosting`} variant="secondary">
              {strings.hero.ctas.selfHosting}
            </AppLinkButton>
          </div>
        </div>
      </section>

      {/* Screenshot */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-6">
        <HomeHeroScreenshots />
      </section>

      {/* Divider */}
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="border-t border-[var(--track-border)]" />
      </div>

      {/* Features grid */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6">
        <div className="mb-12">
          <h2 className="text-[24px] font-semibold text-white">{strings.capability.title}</h2>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-[var(--track-text-muted)]">
            {strings.capability.description}
          </p>
        </div>
        <div className="grid gap-px border border-[var(--track-border)] bg-[var(--track-border)] rounded-[10px] overflow-hidden md:grid-cols-3">
          {strings.capability.items.map((item, i) => {
            const Icon = featureIcons[i % featureIcons.length];
            return (
              <div
                key={item.title}
                className="bg-[var(--track-surface)] p-6 hover:bg-[var(--track-surface-muted)] transition-colors duration-[var(--duration-fast)]"
              >
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[var(--track-accent)]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-[14px] font-semibold text-white">{item.title}</h3>
                <p className="text-[13px] leading-[1.6] text-[var(--track-text-muted)]">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why — horizontal list */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-6">
        <div className="rounded-[10px] border border-[var(--track-border)] bg-[var(--track-surface)] divide-y divide-[var(--track-border)] md:divide-y-0 md:grid md:grid-cols-4 md:divide-x">
          {strings.why.items.map((item) => (
            <div key={item.title} className="px-6 py-5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-accent-text)]">
                {item.title}
              </p>
              <p className="text-[13px] leading-[1.6] text-[var(--track-text-muted)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="border-t border-[var(--track-border)]" />
      </div>

      {/* CTA bottom */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {strings.proof.items.map((item) => {
            const external = item.href.startsWith("http");
            return (
              <div
                key={item.title}
                className="rounded-[10px] border border-[var(--track-border)] bg-[var(--track-surface)] p-6"
              >
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-accent-text)]">
                  {item.title}
                </p>
                <p className="mb-1 text-[18px] font-semibold text-white">{item.value}</p>
                <p className="mb-5 text-[13px] leading-[1.6] text-[var(--track-text-muted)]">
                  {item.body}
                </p>
                <AppLinkButton
                  href={item.href}
                  size="sm"
                  target={external ? "_blank" : undefined}
                  variant="secondary"
                >
                  {item.cta}
                  {external ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                </AppLinkButton>
              </div>
            );
          })}
        </div>
      </section>
    </HomeLayout>
  );
}
