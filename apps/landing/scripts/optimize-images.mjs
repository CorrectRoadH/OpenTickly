import { readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const heroDir = new URL("../public/hero", import.meta.url).pathname;
const widths = [640, 960, 1280];

const files = await readdir(heroDir);
const pngs = files.filter((f) => f.endsWith(".png"));

for (const png of pngs) {
  const input = join(heroDir, png);
  const baseWebp = png.replace(/\.png$/, ".webp");
  await sharp(input).webp({ quality: 82 }).toFile(join(heroDir, baseWebp));
  console.log(`${png} -> ${baseWebp}`);

  for (const width of widths) {
    const output = png.replace(/\.png$/, `-${width}.webp`);
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(join(heroDir, output));
    console.log(`${png} -> ${output}`);
  }
}
