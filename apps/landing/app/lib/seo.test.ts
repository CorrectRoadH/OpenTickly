import { describe, expect, it } from "vitest";
import {
  buildCanonicalUrl,
  buildPageTitle,
  buildRobotsTxt,
  buildSitemapXml,
  resolveSiteUrl,
} from "./seo";

describe("seo helpers", () => {
  it("normalizes the configured site url", () => {
    expect(resolveSiteUrl("https://opentickly.example/")).toBe("https://opentickly.example");
    expect(resolveSiteUrl()).toBe("https://opentoggl.com");
  });

  it("builds canonical urls with stable slashes", () => {
    expect(buildCanonicalUrl("/", "https://opentickly.example")).toBe(
      "https://opentickly.example/",
    );
    expect(buildCanonicalUrl("docs/self-hosting/", "https://opentickly.example/")).toBe(
      "https://opentickly.example/docs/self-hosting",
    );
  });

  it("builds page titles", () => {
    expect(buildPageTitle()).toBe("OpenTickly | Open-Source Time Tracking and Toggl Alternative");
    expect(buildPageTitle("Self-Hosting")).toBe("Self-Hosting | OpenTickly");
  });

  it("builds robots text that points at the sitemap", () => {
    const body = buildRobotsTxt("https://opentickly.example");
    expect(body).toContain("Sitemap: https://opentickly.example/sitemap.xml");
    // The /llms.mdx/ path is intentionally crawlable for LLMs now.
    expect(body).not.toContain("Disallow: /llms.mdx/");
  });

  it("explicitly allows major AI crawlers", () => {
    const body = buildRobotsTxt();
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"]) {
      expect(body).toContain(`User-agent: ${bot}`);
    }
  });

  it("builds sitemap xml with absolute urls", () => {
    const xml = buildSitemapXml(
      [
        {
          pathname: "/",
          changeFrequency: "weekly",
          lastModified: "2026-03-24T00:00:00.000Z",
          priority: 1,
        },
        {
          pathname: "/docs/ai-integration",
          changeFrequency: "monthly",
          priority: 0.7,
        },
      ],
      "https://opentickly.example",
    );

    expect(xml).toContain("<loc>https://opentickly.example/</loc>");
    expect(xml).toContain("<loc>https://opentickly.example/docs/ai-integration</loc>");
    expect(xml).toContain("<changefreq>weekly</changefreq>");
    expect(xml).toContain("<priority>0.7</priority>");
  });
});
