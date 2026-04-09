import { readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const heroDir = new URL("../public/hero", import.meta.url).pathname;

const files = await readdir(heroDir);
const pngs = files.filter((f) => f.endsWith(".png"));

for (const png of pngs) {
  const webp = png.replace(/\.png$/, ".webp");
  if (files.includes(webp)) continue;

  const input = join(heroDir, png);
  const output = join(heroDir, webp);
  await sharp(input).webp({ quality: 80 }).toFile(output);
  console.log(`${png} -> ${webp}`);
}
