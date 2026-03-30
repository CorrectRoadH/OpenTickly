import type { Route } from "./+types/index";
import { source } from "@/lib/source";
import { resolveLocale } from "@/lib/i18n";
import { llms } from "fumadocs-core/source";

export function loader({ params }: Route.LoaderArgs) {
  const lang = resolveLocale(params.lang);
  return new Response(llms(source).index(lang));
}
