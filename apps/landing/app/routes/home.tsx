import { AppLinkButton, SurfaceCard } from "@opentoggl/web-ui";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import {
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  Clock,
  FileText,
  Github,
  GitBranch,
  Lock,
  Play,
  Server,
  Smartphone,
  Webhook,
  Zap,
} from "lucide-react";
import { useParams } from "react-router";

import HomeHeroScreenshots from "@/components/home-hero-screenshots";
import { ListCard, ProofGridCard, SectionHeading } from "@/components/home-primitives";
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

const whatIsIcons = [GitBranch, FileText, Clock];
const capabilityIcons = [Clock, BarChart3, Webhook];
const whyIcons = [CircleDollarSign, Lock, Zap, Smartphone];
const selfHostIcons = [Server, GitBranch, FileText];
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
  const labels =
    locale === "zh"
      ? {
          capability: "兼容目标",
          proof: "公开证据",
          selfHost: "自托管",
          whatIs: "产品定位",
          why: "切换理由",
        }
      : {
          capability: "Compatibility Surface",
          proof: "Open Source Proof",
          selfHost: "Self-Hosting",
          whatIs: "What It Is",
          why: "Why Switch",
        };

  return (
    <HomeLayout {...baseOptions(locale)}>
      <Seo
        locale={locale}
        pathname={`${prefix}/`}
        description={defaultDescription}
        schema={[buildOrganizationSchema(siteUrl), buildFaqSchema([...strings.faq])]}
      />

      <main id="main-content" className="landing-home">
        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-10">
            <SurfaceCard className="p-5 md:p-6">
              <p className="landing-kicker">{strings.hero.eyebrow}</p>
              <h1 className="mt-3 max-w-2xl text-[20px] font-semibold leading-[30px] text-[var(--track-text)]">
                {strings.hero.title}
              </h1>
              <p className="mt-4 max-w-2xl text-[14px] leading-7 text-[var(--track-text-muted)]">
                {strings.hero.body}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <AppLinkButton href="https://track.opentoggl.com" target="_blank">
                  {strings.hero.ctas.liveDemo}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </AppLinkButton>
                <AppLinkButton
                  href="https://github.com/CorrectRoadH/opentoggl"
                  target="_blank"
                  variant="secondary"
                >
                  <Github className="size-4" aria-hidden="true" />
                  {strings.hero.ctas.github}
                </AppLinkButton>
                <AppLinkButton href={`${prefix}/docs/self-hosting`} variant="secondary">
                  {strings.hero.ctas.selfHosting}
                </AppLinkButton>
              </div>
            </SurfaceCard>

            <HomeHeroScreenshots locale={locale} />
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <SectionHeading
                eyebrow={labels.whatIs}
                title={strings.whatIs.title}
                body={strings.whatIs.description}
              />
              <ListCard
                items={strings.whatIs.items.map((item, index) => ({
                  body: item.body,
                  icon: whatIsIcons[index % whatIsIcons.length]!,
                  title: item.title,
                }))}
              />
            </div>

            <div className="space-y-6">
              <SectionHeading
                eyebrow={labels.capability}
                title={strings.capability.title}
                body={strings.capability.description}
              />
              <ListCard
                items={strings.capability.items.map((item, index) => ({
                  body: item.body,
                  icon: capabilityIcons[index % capabilityIcons.length]!,
                  title: item.title,
                }))}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <SectionHeading
                eyebrow={labels.why}
                title={strings.why.title}
                body={strings.why.description}
              />
              <ListCard
                items={strings.why.items.map((item, index) => ({
                  body: item.body,
                  icon: whyIcons[index % whyIcons.length]!,
                  title: item.title,
                }))}
              />
            </div>

            <div className="space-y-6">
              <SectionHeading
                eyebrow={labels.selfHost}
                title={strings.selfHost.title}
                body={strings.selfHost.description}
              />
              <div className="flex flex-wrap gap-3">
                <AppLinkButton href={`${prefix}/docs/self-hosting`} variant="secondary">
                  {strings.hero.ctas.selfHosting}
                </AppLinkButton>
                <AppLinkButton href="https://track.opentoggl.com" target="_blank">
                  {strings.hero.ctas.liveDemo}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </AppLinkButton>
              </div>
              <ListCard
                items={strings.selfHost.items.map((item, index) => ({
                  body: item.body,
                  icon: selfHostIcons[index % selfHostIcons.length]!,
                  title: item.title,
                }))}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
          <SectionHeading
            eyebrow={labels.proof}
            title={strings.proof.title}
            body={strings.proof.description}
          />
          <div className="mt-6">
            <ProofGridCard icons={proofIcons} items={strings.proof.items} />
          </div>
        </section>
      </main>
    </HomeLayout>
  );
}
