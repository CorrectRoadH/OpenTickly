import { glob, stat } from "node:fs/promises";
import { buildSitemapXml, type SitemapEntry } from "@/lib/seo";
import { createGetUrl, getSlugs } from "fumadocs-core/source";
import { i18n } from "@/lib/i18n";

async function getLastModified(path: string): Promise<string | undefined> {
  try {
    const file = await stat(path);
    return file.mtime.toISOString();
  } catch {
    return undefined;
  }
}

async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [
    {
      pathname: "/",
      lastModified: await getLastModified("app/routes/home.tsx"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  for (const lang of i18n.languages) {
    const isDefault = lang === i18n.defaultLanguage;
    const prefix = isDefault ? "" : `/${lang}`;
    const getDocsUrl = createGetUrl(`${prefix}/docs`);

    entries.push({
      pathname: `${prefix}/docs`,
      lastModified: await getLastModified(`content/docs/${lang}/index.mdx`),
      changeFrequency: "weekly",
      priority: 0.9,
    });

    for await (const entry of glob("**/*.mdx", { cwd: `content/docs/${lang}` })) {
      const slugs = getSlugs(entry);
      if (slugs.length === 0) continue;

      entries.push({
        pathname: getDocsUrl(slugs),
        lastModified: await getLastModified(`content/docs/${lang}/${entry}`),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}

export async function loader() {
  const entries = await getSitemapEntries();

  return new Response(buildSitemapXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
