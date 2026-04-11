import type { Config } from "@react-router/dev/config";
import { glob } from "node:fs/promises";
import { createGetUrl, getSlugs } from "fumadocs-core/source";
import { i18n } from "./app/lib/i18n";

export default {
  ssr: false,
  future: {
    v8_middleware: true,
  },
  async prerender({ getStaticPaths }) {
    const paths: string[] = ["/robots.txt", "/sitemap.xml"];
    const excluded: string[] = [];

    for (const path of getStaticPaths()) {
      if (!excluded.includes(path)) paths.push(path);
    }

    for (const lang of i18n.languages) {
      const isDefault = lang === i18n.defaultLanguage;
      const prefix = isDefault ? "" : `/${lang}`;

      // Prerender i18n home pages
      if (!isDefault) paths.push(`/${lang}`);

      const getUrl = createGetUrl(`${prefix}/docs`);

      for await (const entry of glob("**/*.mdx", { cwd: `content/docs/${lang}` })) {
        const slugs = getSlugs(entry);
        paths.push(getUrl(slugs), `${prefix}/llms.mdx/docs/${[...slugs, "index.mdx"].join("/")}`);
      }
    }

    return paths;
  },
} satisfies Config;
