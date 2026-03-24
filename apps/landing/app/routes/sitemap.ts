import { glob, stat } from "node:fs/promises";
import { buildSitemapXml, type SitemapEntry } from "@/lib/seo";
import { createGetUrl, getSlugs } from "fumadocs-core/source";

const getDocsUrl = createGetUrl("/docs");

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
    {
      pathname: "/docs",
      lastModified: await getLastModified("content/docs/index.mdx"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  for await (const entry of glob("**/*.mdx", { cwd: "content/docs" })) {
    const slugs = getSlugs(entry);
    if (slugs.length === 0) continue;

    entries.push({
      pathname: getDocsUrl(slugs),
      lastModified: await getLastModified(`content/docs/${entry}`),
      changeFrequency: "monthly",
      priority: 0.7,
    });
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
