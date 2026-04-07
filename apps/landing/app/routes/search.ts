import { createFromSource } from "fumadocs-core/search/server";
import { createTokenizer } from "@orama/tokenizers/mandarin";
import { source } from "@/lib/source";

const cjkTokenizer = { tokenizer: createTokenizer() };

const server = createFromSource(source, {
  localeMap: {
    en: "english",
    zh: cjkTokenizer,
    es: "spanish",
    ja: cjkTokenizer,
    fr: "french",
    ko: cjkTokenizer,
  },
});

export async function loader() {
  return server.staticGET();
}
