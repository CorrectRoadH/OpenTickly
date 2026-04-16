import type { Route } from "./+types/docs";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { source } from "@/lib/source";
import { i18n, resolveLocale } from "@/lib/i18n";
import browserCollections from "collections/browser";
import { baseOptions, gitConfig } from "@/lib/layout.shared";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { useMDXComponents } from "@/components/mdx";
import Seo from "@/components/seo";
import {
  buildBreadcrumbSchema,
  buildCanonicalUrl,
  buildDocSchema,
  resolveSiteUrl,
  siteName,
} from "@/lib/seo";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  const slugs = params["*"].split("/").filter((v) => v.length > 0);
  const page = source.getPage(slugs, locale);
  if (!page) throw new Response("Not found", { status: 404 });

  return {
    slugs: page.slugs,
    path: page.path,
    url: page.url,
    locale,
    pageTree: await source.serializePageTree(source.getPageTree(locale)),
  };
}

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: Mdx },
    {
      markdownUrl,
      pathname,
      path,
      locale,
    }: {
      markdownUrl: string;
      pathname: string;
      path: string;
      locale: string;
    },
  ) {
    const siteUrl = resolveSiteUrl();
    const description = frontmatter.description ?? "OpenToggl documentation";
    const localePrefix = locale === "en" ? "" : `/${locale}`;
    const breadcrumbItems = [
      { name: siteName, url: buildCanonicalUrl(`${localePrefix}/`, siteUrl) },
      { name: "Docs", url: buildCanonicalUrl(`${localePrefix}/docs`, siteUrl) },
      { name: frontmatter.title, url: buildCanonicalUrl(pathname, siteUrl) },
    ];

    return (
      <DocsPage toc={toc}>
        <Seo
          locale={locale}
          pathname={pathname}
          title={frontmatter.title}
          description={description}
          type="article"
          schema={[
            buildDocSchema({
              title: frontmatter.title,
              description,
              pathname,
              siteUrl,
            }),
            buildBreadcrumbSchema(breadcrumbItems),
          ]}
        />
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{description}</DocsDescription>
        <div className="flex flex-row gap-2 items-center border-b -mt-4 pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${locale}/${path}`}
          />
        </div>
        <DocsBody>
          <Mdx components={useMDXComponents()} />
        </DocsBody>
      </DocsPage>
    );
  },
});

export default function Page({ loaderData }: Route.ComponentProps) {
  const { pageTree, slugs } = useFumadocsLoader(loaderData);
  const locale = loaderData.locale;
  const prefix = locale === i18n.defaultLanguage ? "" : `/${locale}`;
  const markdownUrl = `${prefix}/llms.mdx/docs/${[...slugs, "index.mdx"].join("/")}`;

  return (
    <DocsLayout {...baseOptions(locale)} tree={pageTree}>
      {clientLoader.useContent(loaderData.path, {
        markdownUrl,
        pathname: loaderData.url,
        path: loaderData.path,
        locale,
      })}
    </DocsLayout>
  );
}
