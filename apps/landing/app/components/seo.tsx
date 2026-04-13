import {
  buildCanonicalUrl,
  buildPageTitle,
  defaultDescription,
  defaultOgImagePath,
  defaultKeywords,
  resolveSiteUrl,
  siteName,
} from "@/lib/seo";
import { i18n } from "@/lib/i18n";

type SeoProps = {
  description?: string;
  imagePath?: string;
  imageAlt?: string;
  keywords?: string;
  locale?: string;
  pathname: string;
  robots?: string;
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
  title?: string;
  type?: "article" | "website";
};

const ogLocaleMap: Record<string, string> = {
  en: "en_US",
  zh: "zh_CN",
  es: "es_ES",
  ja: "ja_JP",
  fr: "fr_FR",
  ko: "ko_KR",
  pl: "pl_PL",
  pt: "pt_PT",
};

const hreflangMap: Record<string, string> = {
  en: "en",
  zh: "zh-Hans",
  es: "es",
  ja: "ja",
  fr: "fr",
  ko: "ko",
  pl: "pl",
  pt: "pt",
};

// Strip a leading `/<locale>` segment (and only a full segment) from a pathname.
function stripLocalePrefix(pathname: string, locale: string): string {
  const prefix = `/${locale}`;
  if (pathname === prefix) return "/";
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  return pathname;
}

function buildHreflangEntries(pathname: string, currentLocale: string, siteUrl: string) {
  const defaultLang = i18n.defaultLanguage;
  const entries: Array<{ lang: string; href: string }> = [];

  // Path without any locale prefix (i.e. the default-language version of the URL).
  const basePathname =
    currentLocale === defaultLang ? pathname : stripLocalePrefix(pathname, currentLocale);

  for (const lang of i18n.languages) {
    const isDefault = lang === defaultLang;
    const altPathname = isDefault
      ? basePathname
      : basePathname === "/"
        ? `/${lang}`
        : `/${lang}${basePathname}`;

    entries.push({
      lang: hreflangMap[lang] ?? lang,
      href: buildCanonicalUrl(altPathname, siteUrl),
    });
  }

  // x-default points to the default language version
  entries.push({
    lang: "x-default",
    href: buildCanonicalUrl(basePathname, siteUrl),
  });

  return entries;
}

const defaultImageAlt = "OpenToggl open source time tracking platform";

export default function Seo({
  description = defaultDescription,
  imagePath = defaultOgImagePath,
  imageAlt = defaultImageAlt,
  keywords = defaultKeywords,
  locale = "en",
  pathname,
  robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
  schema,
  title,
  type = "website",
}: SeoProps) {
  const siteUrl = resolveSiteUrl();
  const canonicalUrl = buildCanonicalUrl(pathname, siteUrl);
  const imageUrl = buildCanonicalUrl(imagePath, siteUrl);
  const pageTitle = buildPageTitle(title);
  const hreflangEntries = buildHreflangEntries(pathname, locale, siteUrl);

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={siteName} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />
      {hreflangEntries.map((entry) => (
        <link key={entry.lang} rel="alternate" hrefLang={entry.lang} href={entry.href} />
      ))}
      <meta property="og:locale" content={ogLocaleMap[locale] ?? "en_US"} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      {schema
        ? (Array.isArray(schema) ? schema : [schema]).map((entry, index) => (
            <script
              key={index}
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
            />
          ))
        : null}
    </>
  );
}
