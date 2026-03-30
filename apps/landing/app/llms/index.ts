import type { Route } from "./+types/index";
import { source } from "@/lib/source";
import { i18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { llms } from "fumadocs-core/source";

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const firstSegment = url.pathname.split("/")[1];
  const lang: Locale = (i18n.languages as readonly string[]).includes(firstSegment)
    ? (firstSegment as Locale)
    : i18n.defaultLanguage;
  return new Response(llms(source).index(lang));
}
