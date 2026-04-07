import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route(":lang", "routes/home.tsx", { id: "home-i18n" }),
  route("docs/*", "routes/docs.tsx", { id: "docs-default" }),
  route(":lang/docs/*", "routes/docs.tsx", { id: "docs-i18n" }),
  route("api/search", "routes/search.ts"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),

  // LLM integration:
  route("llms.txt", "llms/index.ts", { id: "llms-index-default" }),
  route("llms-full.txt", "llms/full.ts", { id: "llms-full-default" }),
  route("llms.mdx/docs/*", "llms/mdx.ts", { id: "llms-mdx-default" }),
  route("zh/llms.txt", "llms/index.ts", { id: "llms-index-zh" }),
  route("zh/llms-full.txt", "llms/full.ts", { id: "llms-full-zh" }),
  route("zh/llms.mdx/docs/*", "llms/mdx.ts", { id: "llms-mdx-zh" }),
  route("es/llms.txt", "llms/index.ts", { id: "llms-index-es" }),
  route("es/llms-full.txt", "llms/full.ts", { id: "llms-full-es" }),
  route("es/llms.mdx/docs/*", "llms/mdx.ts", { id: "llms-mdx-es" }),
  route("ja/llms.txt", "llms/index.ts", { id: "llms-index-ja" }),
  route("ja/llms-full.txt", "llms/full.ts", { id: "llms-full-ja" }),
  route("ja/llms.mdx/docs/*", "llms/mdx.ts", { id: "llms-mdx-ja" }),
  route("fr/llms.txt", "llms/index.ts", { id: "llms-index-fr" }),
  route("fr/llms-full.txt", "llms/full.ts", { id: "llms-full-fr" }),
  route("fr/llms.mdx/docs/*", "llms/mdx.ts", { id: "llms-mdx-fr" }),
  route("ko/llms.txt", "llms/index.ts", { id: "llms-index-ko" }),
  route("ko/llms-full.txt", "llms/full.ts", { id: "llms-full-ko" }),
  route("ko/llms.mdx/docs/*", "llms/mdx.ts", { id: "llms-mdx-ko" }),

  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
