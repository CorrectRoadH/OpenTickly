import type { Route } from "./+types/full";
import { getLLMText, source } from "@/lib/source";
import { i18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { buildLlmsSummary } from "@/lib/llms-summary";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const firstSegment = url.pathname.split("/")[1];
  const lang: Locale = (i18n.languages as readonly string[]).includes(firstSegment)
    ? (firstSegment as Locale)
    : i18n.defaultLanguage;

  const summary = buildLlmsSummary(lang);
  const scan = source.getPages(lang).map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response([summary, ...scanned].join("\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
