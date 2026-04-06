import { AppLinkButton, SurfaceCard } from "@opentoggl/web-ui";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { ArrowUpRight, FileText, Github, Play, RefreshCw, Server, Unlock } from "lucide-react";
import { useParams } from "react-router";

import HomeHeroScreenshots from "@/components/home-hero-screenshots";
import { ProofGridCard } from "@/components/home-primitives";
import { RotatingWords } from "@/components/rotating-words";
import Seo from "@/components/seo";
import { homeContent } from "@/lib/home-content";
import { i18n } from "@/lib/i18n";
import { baseOptions } from "@/lib/layout.shared";
import {
  buildFaqSchema,
  buildOrganizationSchema,
  defaultDescription,
  resolveSiteUrl,
} from "@/lib/seo";

const featureIcons = [RefreshCw, Server, Unlock];
const proofIcons = [Play, Github, FileText];

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
        locale={locale}
        pathname={`${prefix}/`}
        description={defaultDescription}
        schema={[buildOrganizationSchema(siteUrl), buildFaqSchema([...strings.faq])]}
      />

      <main id="main-content" className="landing-home">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[14px] font-semibold uppercase tracking-[0.1em] text-[var(--track-text-muted)]">
              OpenToggl
            </p>
            <h1 className="mt-3 text-[28px] font-semibold leading-[38px] text-[var(--track-text)] md:text-[36px] md:leading-[46px]">
              {strings.hero.taglineBefore}
              <RotatingWords words={strings.hero.rotatingWords} />
              {strings.hero.taglineAfter}
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-[var(--track-text-muted)]">
              {strings.hero.subtitle}
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <AppLinkButton href="https://track.opentoggl.com" target="_blank">
                {strings.hero.ctas.tryDemo}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </AppLinkButton>
              <AppLinkButton href={`${prefix}/docs/self-hosting`} variant="secondary">
                {strings.hero.ctas.selfHost}
              </AppLinkButton>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-4xl">
            <HomeHeroScreenshots locale={locale} />
          </div>
        </section>

        {/* Features — 3 columns */}
        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
          <SurfaceCard className="p-0">
            <div className="grid md:grid-cols-3">
              {strings.features.items.map((item, index) => {
                const Icon = featureIcons[index % featureIcons.length]!;

                return (
                  <div
                    key={item.title}
                    className={`p-5 ${index > 0 ? "border-t border-[var(--track-border)] md:border-l md:border-t-0" : ""}`}
                  >
                    <div className="flex size-8 items-center justify-center rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[var(--track-accent)]">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 text-[14px] font-semibold text-[var(--track-text)]">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-[12px] leading-5 text-[var(--track-text-muted)]">
                      {item.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>
        </section>

        {/* Proof */}
        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
          <ProofGridCard icons={proofIcons} items={strings.proof.items} />
        </section>
      </main>
    </HomeLayout>
  );
}
