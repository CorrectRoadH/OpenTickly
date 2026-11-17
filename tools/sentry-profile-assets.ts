import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { parse } from "@babel/parser";
import type { Plugin } from "vite";

/** Derive the finite symbol set from emitted code, never from runtime profiles. */
export function artifactSymbols(code: string): string[] {
  const ast = parse(code, { sourceType: "unambiguous" });
  const symbols = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const node = value as Record<string, unknown>;
    if (node.type === "Identifier" && typeof node.name === "string") symbols.add(node.name);
    for (const [key, child] of Object.entries(node)) if (key !== "loc") visit(child);
  };
  visit(ast);
  return [...symbols].sort();
}
export function profileAssets(release: string): Plugin {
  return {
    name: "sentry-profile-assets",
    apply: "build",
    generateBundle(_options, bundle) {
      if (Object.keys(bundle).every((file) => !file.endsWith(".js"))) return;
      const assets = Object.fromEntries(
        Object.values(bundle).flatMap((entry) =>
          entry.type === "chunk" ? [[`/${entry.fileName}`, artifactSymbols(entry.code)]] : [],
        ),
      );
      if (!Object.keys(assets).length) throw new Error("Missing Sentry profiling artifacts");
      this.emitFile({
        type: "asset",
        fileName: "sentry-profile-assets.json",
        source: JSON.stringify({ release, assets }),
      });
    },
    writeBundle: {
      order: "post",
      sequential: true,
      handler(options, bundle) {
        if (!Object.values(bundle).some((entry) => entry.type === "chunk")) return;
        const directory = options.dir ?? (options.file ? dirname(options.file) : undefined);
        if (!directory) this.error("Missing profiling output directory");
        const manifest = JSON.parse(
          readFileSync(join(directory!, "sentry-profile-assets.json"), "utf8"),
        ) as { release: string; assets: Record<string, string[]> };
        if (manifest.release !== release || !Object.keys(manifest.assets).length)
          this.error("Invalid profiling artifact manifest");
        for (const path of Object.keys(manifest.assets))
          if (!existsSync(join(directory!, path.slice(1))))
            this.error("Missing profiling artifact");
      },
    },
  };
}
