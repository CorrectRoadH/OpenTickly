import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import * as MdxConfig from "./source.config";

export default defineConfig({
  plugins: [mdx(MdxConfig), tailwindcss(), reactRouter()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "app"),
      collections: resolve(__dirname, ".source"),
    },
  },
});
