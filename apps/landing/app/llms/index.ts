import type { Route } from "./+types/index";
import { source } from "@/lib/source";
import { i18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { buildLlmsSummary } from "@/lib/llms-summary";
import { llms } from "fumadocs-core/source";

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const firstSegment = url.pathname.split("/")[1];
  const lang: Locale = (i18n.languages as readonly string[]).includes(firstSegment)
    ? (firstSegment as Locale)
    : i18n.defaultLanguage;

  const summary = buildLlmsSummary(lang);
  const docsIndex = llms(source).index(lang);

  return new Response(`${summary}${docsIndex}`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
