export const siteName = "OpenToggl";
export const siteUrl = "https://opentoggl.com";
export const defaultTitle = "Free Private-First Toggl Alternative";
export const defaultDescription =
  "OpenToggl is a free, private-first, AI-friendly alternative to Toggl for teams that want control over hosting, data, and API throughput.";
export const defaultOgImagePath = "/og-image.svg";
export const defaultKeywords = [
  "OpenToggl",
  "open source time tracking",
  "self-hosted time tracking",
  "Toggl alternative",
  "private-first time tracking",
  "AI-friendly time tracking",
  "time tracking software",
].join(", ");

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
    "Disallow: /llms.mdx/",
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
      if (typeof entry.priority === "number") lines.push(`<priority>${entry.priority.toFixed(1)}</priority>`);

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
    operatingSystem: "Web",
    description: defaultDescription,
    url: siteUrl,
    sameAs: ["https://github.com/CorrectRoadH/opentoggl"],
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
