import type { Route } from "./+types/mdx";
import { getLLMText, source } from "@/lib/source";
import { i18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const firstSegment = url.pathname.split("/")[1];
  const lang: Locale = (i18n.languages as readonly string[]).includes(firstSegment)
    ? (firstSegment as Locale)
    : i18n.defaultLanguage;
  const slugs = params["*"].split("/").filter((v: string) => v.length > 0);
  // remove the appended "index.mdx" that's added to avoid React Router issues
  slugs.pop();
  const page = source.getPage(slugs, lang);
  if (!page) {
    return new Response("not found", { status: 404 });
  }
  return new Response(await getLLMText(page), {
    headers: {
      "Content-Type": "text/markdown",
    },
  });
}
