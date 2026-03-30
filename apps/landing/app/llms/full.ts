import type { Route } from "./+types/full";
import { getLLMText, source } from "@/lib/source";
import { resolveLocale } from "@/lib/i18n";

export async function loader({ params }: Route.LoaderArgs) {
  const lang = resolveLocale(params.lang);
  const scan = source.getPages(lang).map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join("\n\n"));
}
