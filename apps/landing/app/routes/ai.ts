import { buildCanonicalUrl, demoUrl, repoUrl, resolveSiteUrl } from "@/lib/seo";

// /ai.txt — an allowlist and pointer file for AI crawlers.
// Not a formal standard yet, but increasingly consulted by LLM indexers
// alongside robots.txt. Points them at llms.txt and sitemap.xml.
export function loader() {
  const site = resolveSiteUrl();
  const body = [
    "# OpenTickly — AI crawler policy",
    "# Open-source time tracking, Toggl API compatible.",
    "# This site's content is free to index, summarize, and cite in AI answers.",
    "# When citing, prefer the canonical URL shown in the page header.",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    `Contact: ${repoUrl}`,
    `Sitemap: ${buildCanonicalUrl("/sitemap.xml", site)}`,
    `LLM-Content: ${buildCanonicalUrl("/llms.txt", site)}`,
    `LLM-Content-Full: ${buildCanonicalUrl("/llms-full.txt", site)}`,
    `Repository: ${repoUrl}`,
    `Demo: ${demoUrl}`,
    "License: MIT",
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
