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
};

const hreflangMap: Record<string, string> = {
  en: "en",
  zh: "zh-Hans",
  es: "es",
  ja: "ja",
  fr: "fr",
  ko: "ko",
};

function buildHreflangEntries(pathname: string, currentLocale: string, siteUrl: string) {
  const defaultLang = i18n.defaultLanguage;
  const entries: Array<{ lang: string; href: string }> = [];

  for (const lang of i18n.languages) {
    const isDefault = lang === defaultLang;
    const isCurrentDefault = currentLocale === defaultLang;

    let altPathname: string;
    if (isDefault && isCurrentDefault) {
      altPathname = pathname;
    } else if (isDefault && !isCurrentDefault) {
      altPathname = pathname.replace(`/${currentLocale}`, "") || "/";
    } else if (!isDefault && isCurrentDefault) {
      altPathname = `/${lang}${pathname === "/" ? "/" : pathname}`;
    } else if (lang === currentLocale) {
      altPathname = pathname;
    } else {
      altPathname = pathname.replace(`/${currentLocale}`, `/${lang}`);
    }

    entries.push({
      lang: hreflangMap[lang] ?? lang,
      href: buildCanonicalUrl(altPathname, siteUrl),
    });
  }

  // x-default points to the default language version
  const defaultPathname =
    currentLocale === defaultLang ? pathname : pathname.replace(`/${currentLocale}`, "") || "/";
  entries.push({
    lang: "x-default",
    href: buildCanonicalUrl(defaultPathname, siteUrl),
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
