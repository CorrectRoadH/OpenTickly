import {
  buildCanonicalUrl,
  buildPageTitle,
  defaultDescription,
  defaultOgImagePath,
  defaultKeywords,
  resolveSiteUrl,
  siteName,
} from "@/lib/seo";

type SeoProps = {
  description?: string;
  imagePath?: string;
  keywords?: string;
  pathname: string;
  robots?: string;
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
  title?: string;
  type?: "article" | "website";
};

export default function Seo({
  description = defaultDescription,
  imagePath = defaultOgImagePath,
  keywords = defaultKeywords,
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

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={siteName} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content="OpenToggl open source time tracking platform" />
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
