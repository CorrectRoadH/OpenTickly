import type { Route } from "./+types/mdx";
import { getLLMText, source } from "@/lib/source";
import { resolveLocale } from "@/lib/i18n";

export async function loader({ params }: Route.LoaderArgs) {
  const lang = resolveLocale(params.lang);
  const slugs = params["*"].split("/").filter((v) => v.length > 0);
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
