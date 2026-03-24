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
    expect(resolveSiteUrl("https://opentoggl.example/")).toBe("https://opentoggl.example");
    expect(resolveSiteUrl()).toBe("https://opentoggl.com");
  });

  it("builds canonical urls with stable slashes", () => {
    expect(buildCanonicalUrl("/", "https://opentoggl.example")).toBe("https://opentoggl.example/");
    expect(buildCanonicalUrl("docs/self-hosting/", "https://opentoggl.example/")).toBe(
      "https://opentoggl.example/docs/self-hosting",
    );
  });

  it("builds page titles", () => {
    expect(buildPageTitle()).toBe("OpenToggl | Open Source Self-Hosted Time Tracking Platform");
    expect(buildPageTitle("Self-Hosting")).toBe("Self-Hosting | OpenToggl");
  });

  it("builds robots text that points at the sitemap", () => {
    expect(buildRobotsTxt("https://opentoggl.example")).toContain(
      "Sitemap: https://opentoggl.example/sitemap.xml",
    );
    expect(buildRobotsTxt("https://opentoggl.example")).toContain("Disallow: /llms.mdx/");
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
      "https://opentoggl.example",
    );

    expect(xml).toContain("<loc>https://opentoggl.example/</loc>");
    expect(xml).toContain("<loc>https://opentoggl.example/docs/ai-integration</loc>");
    expect(xml).toContain("<changefreq>weekly</changefreq>");
    expect(xml).toContain("<priority>0.7</priority>");
  });
});
