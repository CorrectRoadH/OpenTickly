import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { i18n } from "./i18n";
import { appendSlot } from "./utm";

export const gitConfig = {
  user: "CorrectRoadH",
  repo: "OpenTickly",
  branch: "main",
};

export function baseOptions(locale?: string): BaseLayoutProps {
  const prefix = locale && locale !== i18n.defaultLanguage ? `/${locale}` : "";
  return {
    nav: {
      title: "OpenTickly",
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
    // GitHub ignores UTM; ?s=nav_header lets Ahrefs outbound report split by slot.
    githubUrl: appendSlot(`https://github.com/${gitConfig.user}/${gitConfig.repo}`, "nav_header"),
  };
}
