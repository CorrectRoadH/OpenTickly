import type { Locale } from "./i18n";

export const siteName = "OpenTickly";
export const siteUrl = "https://opentickly.com";
export const defaultTitle = "Open-Source Time Tracking and Toggl Alternative";
export const defaultDescription =
  "OpenTickly is a free, open-source time tracking and time management app for individuals and teams, and a practical alternative to Toggl.";
export const defaultOgImagePath = "/og-image.png";

export const repoUrl = "https://github.com/CorrectRoadH/OpenTickly";
export const demoUrl = "https://track.opentickly.com";

export const localizedDescriptions: Record<Locale, string> = {
  en: "OpenTickly is an open-source Toggl alternative: 100% Toggl API-compatible, one-command Docker self-hosting, your data stays yours. No seat limits — free for individuals and teams.",
  zh: "OpenTickly 是开源的 Toggl 替代方案：100% 兼容 Toggl API，一键 Docker 自托管，数据完全在你手里。无座位限制，个人与团队免费使用。",
  es: "OpenTickly es la alternativa open source a Toggl: 100% compatible con la API de Toggl, autoalojamiento con Docker en un comando, tus datos siguen siendo tuyos. Sin límite de asientos, gratis para individuos y equipos.",
  ja: "OpenTickly はオープンソースの Toggl 代替ツール。Toggl API に 100% 互換、Docker ワンコマンドでセルフホスト、データはあなたの手の中に。シート数無制限、個人・チームとも無料で利用可能。",
  fr: "OpenTickly est l'alternative open source à Toggl : 100 % compatible avec l'API Toggl, auto-hébergement Docker en une commande, vos données restent les vôtres. Sans limite d'utilisateurs, gratuit pour les particuliers et les équipes.",
  ko: "OpenTickly은 오픈소스 Toggl 대안입니다. Toggl API 100% 호환, Docker 한 줄 명령으로 셀프호스팅, 데이터는 전적으로 본인 관리. 좌석 수 제한 없이 개인과 팀 모두 무료로 사용 가능.",
  pl: "OpenTickly to otwartoźródłowa alternatywa dla Toggl: w 100% zgodna z API Toggl, samodzielny hosting Dockera jedną komendą, Twoje dane pozostają Twoje. Bez limitu miejsc — darmowa dla osób i zespołów.",
  pt: "OpenTickly é a alternativa open source ao Toggl: 100% compatível com a API do Toggl, auto-hospedagem Docker em um comando, seus dados continuam seus. Sem limite de assentos — grátis para indivíduos e equipes.",
};

const defaultOgImageAlt = "OpenTickly open source time tracking platform";

export const localizedOgImageAlt: Record<Locale, string> = {
  en: defaultOgImageAlt,
  zh: "OpenTickly 开源时间追踪平台",
  es: "OpenTickly plataforma de seguimiento de tiempo de código abierto",
  ja: "OpenTickly オープンソース時間管理プラットフォーム",
  fr: "OpenTickly plateforme open source de suivi du temps",
  ko: "OpenTickly 오픈소스 시간 추적 플랫폼",
  pl: "OpenTickly — open-source'owa platforma śledzenia czasu",
  pt: "OpenTickly — plataforma open source de rastreamento de tempo",
};

export function resolveOgImageAlt(locale: string): string {
  return localizedOgImageAlt[locale as Locale] ?? defaultOgImageAlt;
}

export function resolveLocalizedDescription(locale: string): string {
  return localizedDescriptions[locale as Locale] ?? defaultDescription;
}

export type SitemapEntry = {
  pathname: string;
  changeFrequency?: "daily" | "weekly" | "monthly";
  lastModified?: string;
  priority?: number;
};

export function resolveSiteUrl(rawSiteUrl?: string): string {
  const resolvedSiteUrl = rawSiteUrl?.trim() || siteUrl;
  return resolvedSiteUrl.endsWith("/") ? resolvedSiteUrl.slice(0, -1) : resolvedSiteUrl;
}

export function buildPageTitle(title?: string): string {
  if (!title) return `${siteName} | ${defaultTitle}`;
  return `${title} | ${siteName}`;
}

export function buildCanonicalUrl(pathname: string, rawSiteUrl?: string): string {
  const siteUrl = resolveSiteUrl(rawSiteUrl);
  const normalizedPath = pathname === "/" ? "/" : `/${pathname.replace(/^\/+|\/+$/g, "")}`;
  return new URL(normalizedPath, `${siteUrl}/`).toString();
}

export function buildRobotsTxt(rawSiteUrl?: string): string {
  const sitemapUrl = buildCanonicalUrl("/sitemap.xml", rawSiteUrl);

  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/search",
    "",
    "# AI crawlers — explicitly allowed.",
    "# /llms.txt, /llms-full.txt and /llms.mdx/* are intended for LLM consumption.",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: Claude-SearchBot",
    "Allow: /",
    "",
    "User-agent: Claude-User",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: Perplexity-User",
    "Allow: /",
    "",
    "User-agent: Google-Extended",
    "Allow: /",
    "",
    "User-agent: CCBot",
    "Allow: /",
    "",
    `Sitemap: ${sitemapUrl}`,
  ].join("\n");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildSitemapXml(entries: SitemapEntry[], rawSiteUrl?: string): string {
  const urls = entries
    .map((entry) => {
      const lines = [`<loc>${escapeXml(buildCanonicalUrl(entry.pathname, rawSiteUrl))}</loc>`];
      if (entry.lastModified) lines.push(`<lastmod>${escapeXml(entry.lastModified)}</lastmod>`);
      if (entry.changeFrequency) lines.push(`<changefreq>${entry.changeFrequency}</changefreq>`);
      if (typeof entry.priority === "number")
        lines.push(`<priority>${entry.priority.toFixed(1)}</priority>`);

      return `<url>${lines.join("")}</url>`;
    })
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
  ].join("");
}

export function buildOrganizationSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "TimeTrackingApplication",
    operatingSystem: "Web, Linux, macOS, Windows (via Docker)",
    description: defaultDescription,
    url: siteUrl,
    screenshot: `${siteUrl}${defaultOgImagePath}`,
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    softwareVersion: "rolling",
    featureList: [
      "Toggl Track API v9 compatibility",
      "Toggl Reports API v3 compatibility",
      "Toggl Webhooks API v1 compatibility",
      "One-command Docker self-hosting (docker compose up -d)",
      "Unlimited users with no seat limits",
      "Hosted demo at track.opentickly.com",
      "AI-agent-friendly API with no third-party rate limits",
      "Import from Toggl export files to preserve history",
      "Runs on CasaOS, Synology, fnOS, and any Docker host",
    ],
    sameAs: [repoUrl, demoUrl],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function buildWebSiteSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: defaultDescription,
    inLanguage: ["en", "zh", "es", "ja", "fr", "ko", "pl", "pt"],
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
  };
}

export type BreadcrumbItem = { name: string; url: string };

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildFaqSchema(
  questions: Array<{
    answer: string;
    question: string;
  }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildDocSchema(args: {
  description: string;
  pathname: string;
  siteUrl: string;
  title: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: args.title,
    description: args.description,
    url: buildCanonicalUrl(args.pathname, args.siteUrl),
    about: siteName,
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: args.siteUrl,
    },
  };
}
