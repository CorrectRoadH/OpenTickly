import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { i18n } from "./i18n";
import { appendUtm } from "./utm";

export const gitConfig = {
  user: "CorrectRoadH",
  repo: "opentoggl",
  branch: "main",
};

export function baseOptions(locale?: string): BaseLayoutProps {
  const prefix = locale && locale !== i18n.defaultLanguage ? `/${locale}` : "";
  const resolvedLocale = locale ?? i18n.defaultLanguage;
  return {
    nav: {
      title: "OpenToggl",
      url: prefix || "/",
    },
    links: [
      {
        text: "Docs",
        url: `${prefix}/docs`,
        on: "nav",
        active: "nested-url",
      },
    ],
    githubUrl: appendUtm(`https://github.com/${gitConfig.user}/${gitConfig.repo}`, {
      source: "opentoggl_landing",
      medium: "nav_header",
      campaign: "github",
      content: resolvedLocale,
    }),
  };
}
