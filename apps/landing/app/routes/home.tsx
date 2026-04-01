import { HomeLayout } from "fumadocs-ui/layouts/home";
import { AppLinkButton, MarketingCard, MarketingSection, SurfaceCard } from "@opentoggl/web-ui";
import { ArrowUpRight, Github } from "lucide-react";
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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 md:px-6 md:py-8">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
          <SurfaceCard className="space-y-6 p-5 md:p-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-accent-text)]">
                {strings.hero.eyebrow}
              </p>
              <h1 className="max-w-[18ch] text-[20px] font-semibold leading-[1.3] text-white">
                {strings.hero.title}
              </h1>
              <p className="max-w-2xl text-[14px] leading-6 text-[var(--track-text-muted)]">
                {strings.hero.body}
              </p>
            </div>

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

            <div className="grid gap-3 md:grid-cols-3">
              {strings.hero.highlights.map((item) => (
                <MarketingCard key={item.title} description={item.body} title={item.title} />
              ))}
            </div>
          </SurfaceCard>

          <HomeHeroScreenshots locale={locale} />
        </section>

        <MarketingSection description={strings.whatIs.description} title={strings.whatIs.title}>
          <div className="grid gap-4 md:grid-cols-3">
            {strings.whatIs.items.map((item) => (
              <MarketingCard key={item.title} description={item.body} title={item.title} />
            ))}
          </div>
        </MarketingSection>

        <MarketingSection
          description={strings.capability.description}
          title={strings.capability.title}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {strings.capability.items.map((item) => (
              <MarketingCard key={item.title} description={item.body} title={item.title} />
            ))}
          </div>
        </MarketingSection>

        <MarketingSection description={strings.selfHost.description} title={strings.selfHost.title}>
          <div className="grid gap-4 md:grid-cols-3">
            {strings.selfHost.items.map((item) => (
              <MarketingCard key={item.title} description={item.body} title={item.title} />
            ))}
          </div>
        </MarketingSection>

        <MarketingSection description={strings.why.description} title={strings.why.title}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {strings.why.items.map((item) => (
              <MarketingCard key={item.title} description={item.body} title={item.title} />
            ))}
          </div>
        </MarketingSection>

        <MarketingSection description={strings.proof.description} title={strings.proof.title}>
          <div className="grid gap-4 md:grid-cols-3">
            {strings.proof.items.map((item) => {
              const external = item.href.startsWith("http");

              return (
                <MarketingCard
                  key={item.title}
                  description={item.body}
                  eyebrow={item.title}
                  title={item.value}
                >
                  <div className="pt-1">
                    <AppLinkButton
                      href={item.href}
                      size="sm"
                      target={external ? "_blank" : undefined}
                      variant="secondary"
                    >
                      {item.cta}
                      {external ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : null}
                    </AppLinkButton>
                  </div>
                </MarketingCard>
              );
            })}
          </div>
        </MarketingSection>
      </main>
    </HomeLayout>
  );
}
