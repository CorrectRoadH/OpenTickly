import { AppLinkButton, SurfaceCard } from "@opentoggl/web-ui";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import {
  ArrowUpRight,
  ChevronDown,
  FileText,
  Github,
  Play,
  RefreshCw,
  Server,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";

import Footer from "@/components/footer";
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

const localizedDescriptions: Record<string, string> = {
  en: defaultDescription,
  zh: "OpenToggl 是一款免费开源的时间追踪与时间管理应用，兼容 Toggl API，支持自托管，适合个人和团队使用。",
  es: "OpenToggl es una aplicación gratuita y de código abierto para el seguimiento del tiempo, compatible con la API de Toggl y autoalojable.",
  ja: "OpenToggl は無料のオープンソース時間管理アプリです。Toggl API 互換でセルフホスト可能。個人・チーム向け。",
  fr: "OpenToggl est une application open source gratuite de suivi du temps, compatible avec l'API Toggl et auto-hébergeable.",
  ko: "OpenToggl은 무료 오픈소스 시간 추적 앱입니다. Toggl API 호환, 셀프호스팅 지원, 개인 및 팀용.",
};

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
        description={localizedDescriptions[locale] ?? defaultDescription}
        imageAlt={
          locale === "zh"
            ? "OpenToggl 开源时间追踪平台"
            : locale === "ja"
              ? "OpenToggl オープンソース時間管理プラットフォーム"
              : locale === "ko"
                ? "OpenToggl 오픈소스 시간 추적 플랫폼"
                : locale === "es"
                  ? "OpenToggl plataforma de seguimiento de tiempo de código abierto"
                  : locale === "fr"
                    ? "OpenToggl plateforme open source de suivi du temps"
                    : undefined
        }
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

        {/* FAQ */}
        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
          <h2 className="text-[20px] font-semibold text-[var(--track-text)] mb-4">
            {locale === "zh"
              ? "常见问题"
              : locale === "ja"
                ? "よくある質問"
                : locale === "ko"
                  ? "자주 묻는 질문"
                  : locale === "es"
                    ? "Preguntas frecuentes"
                    : locale === "fr"
                      ? "Questions fréquentes"
                      : "Frequently Asked Questions"}
          </h2>
          <SurfaceCard className="p-0 divide-y divide-[var(--track-border)]">
            {strings.faq.map((item) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </SurfaceCard>
        </section>
      </main>
      <Footer locale={locale} />
    </HomeLayout>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-5">
      <button
        type="button"
        className="flex w-full items-center justify-between py-4 text-left text-[14px] font-semibold text-[var(--track-text)]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {question}
        <ChevronDown
          className={`size-4 shrink-0 text-[var(--track-text-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <p className="pb-4 text-[13px] leading-6 text-[var(--track-text-muted)]">{answer}</p>
      )}
    </div>
  );
}
