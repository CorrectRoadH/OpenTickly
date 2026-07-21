import { existsSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const heroDir = new URL("../public/hero", import.meta.url).pathname;
const widths = [640, 960, 1280];

const isUpToDate = (input, output) =>
  existsSync(output) && statSync(output).mtimeMs >= statSync(input).mtimeMs;

const files = await readdir(heroDir);
const pngs = files.filter((f) => f.endsWith(".png"));

let encoded = 0;
let skipped = 0;

for (const png of pngs) {
  const input = join(heroDir, png);
  const baseWebp = png.replace(/\.png$/, ".webp");
  const baseOutput = join(heroDir, baseWebp);
  if (isUpToDate(input, baseOutput)) {
    skipped++;
    console.log(`${png} -> ${baseWebp} (skipped, up to date)`);
  } else {
    await sharp(input).webp({ quality: 82 }).toFile(baseOutput);
    encoded++;
    console.log(`${png} -> ${baseWebp}`);
  }

  for (const width of widths) {
    const outputName = png.replace(/\.png$/, `-${width}.webp`);
    const output = join(heroDir, outputName);
    if (isUpToDate(input, output)) {
      skipped++;
      console.log(`${png} -> ${outputName} (skipped, up to date)`);
    } else {
      await sharp(input)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(output);
      encoded++;
      console.log(`${png} -> ${outputName}`);
    }
  }
}

console.log(`Images: ${encoded} encoded, ${skipped} skipped.`);
