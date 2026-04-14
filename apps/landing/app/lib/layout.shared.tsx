import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { i18n } from "./i18n";

export const gitConfig = {
  user: "CorrectRoadH",
  repo: "opentoggl",
  branch: "main",
};

export function baseOptions(locale?: string): BaseLayoutProps {
  const prefix = locale && locale !== i18n.defaultLanguage ? `/${locale}` : "";
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
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
