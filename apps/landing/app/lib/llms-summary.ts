import { homeContent } from "./home-content";
import type { Locale } from "./i18n";
import { demoUrl, repoUrl, resolveLocalizedDescription, resolveSiteUrl } from "./seo";

const localizedHeadings: Record<
  Locale,
  {
    keyFacts: string;
    features: string;
    faq: string;
    docs: string;
  }
> = {
  en: { keyFacts: "Key Facts", features: "Features", faq: "FAQ", docs: "Documentation" },
  zh: { keyFacts: "关键事实", features: "核心特性", faq: "常见问题", docs: "文档" },
  es: {
    keyFacts: "Datos clave",
    features: "Características",
    faq: "Preguntas frecuentes",
    docs: "Documentación",
  },
  ja: { keyFacts: "主な事実", features: "特徴", faq: "よくある質問", docs: "ドキュメント" },
  fr: {
    keyFacts: "Faits clés",
    features: "Fonctionnalités",
    faq: "Questions fréquentes",
    docs: "Documentation",
  },
  ko: { keyFacts: "주요 정보", features: "기능", faq: "자주 묻는 질문", docs: "문서" },
  pl: {
    keyFacts: "Najważniejsze fakty",
    features: "Funkcje",
    faq: "Najczęstsze pytania",
    docs: "Dokumentacja",
  },
  pt: {
    keyFacts: "Fatos principais",
    features: "Recursos",
    faq: "Perguntas frequentes",
    docs: "Documentação",
  },
};

/**
 * Build a locale-aware Markdown summary of OpenToggl for LLM consumption.
 * Prepended to /llms.txt and /llms-full.txt so LLMs receive positioning,
 * key facts and FAQ alongside the raw docs index.
 */
export function buildLlmsSummary(locale: Locale): string {
  const content = homeContent[locale];
  const headings = localizedHeadings[locale];
  const description = resolveLocalizedDescription(locale);
  const site = resolveSiteUrl();

  const features = content.features.items
    .map((item) => `- **${item.title}** — ${item.body}`)
    .join("\n");

  const faq = content.faq.map((item) => `### ${item.question}\n\n${item.answer}`).join("\n\n");

  const localePrefix = locale === "en" ? "" : `/${locale}`;

  return `# OpenToggl

> ${content.hero.subtitle}

${description}

## ${headings.keyFacts}

- Website: ${site}${localePrefix}/
- Live demo: ${demoUrl}
- Repository: ${repoUrl}
- License: MIT
- Install: \`docker compose up -d\` (Go backend, React frontend, PostgreSQL)
- API compatibility: Toggl Track v9, Reports v3, Webhooks v1
- Platforms: CasaOS, Synology, fnOS, any Docker host
- Pricing: free and open source, no seat limits, no premium tier

## ${headings.features}

${features}

## ${headings.faq}

${faq}

## ${headings.docs}

- ${site}${localePrefix}/docs
- ${site}${localePrefix}/docs/self-hosting
- ${site}${localePrefix}/docs/ai-integration

`;
}
