import { createFromSource } from "fumadocs-core/search/server";
import { createTokenizer } from "@orama/tokenizers/mandarin";
import { source } from "@/lib/source";

const server = createFromSource(source, {
  language: "english",
  localeMap: {
    zh: { tokenizer: createTokenizer() },
  },
});

export async function loader() {
  return server.staticGET();
}
