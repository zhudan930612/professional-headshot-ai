import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { PORTRAIT_WIDTHS } from '@/lib/responsiveImages';

const directory = 'public/optimized/portraits';
const manifestPath = 'public/optimized/manifest.json';
interface Entry { sourceHash: string; outputs: Record<string, { bytes: number; hash: string }> }
const settings = { widths: [...PORTRAIT_WIDTHS], format: 'webp', quality: 78, effort: 5, sharp: sharp.versions.sharp };
const configuration = JSON.stringify(settings);
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
let previous: { configuration: string; images: Record<string, Entry> } | undefined;
try { previous = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { /* Generate on a clean checkout. */ }
await mkdir(directory, { recursive: true });
const images: Record<string, Entry> = {};
let generated = 0;
for (const name of (await readdir('public/best-headshot')).filter(name => /^best_\d{2}\.jpeg$/.test(name)).sort()) {
  const source = await readFile(`public/best-headshot/${name}`);
  const sourceHash = digest(source);
  const old = previous?.configuration === configuration ? previous.images[name] : undefined;
  const outputs: Entry['outputs'] = {};
  for (const width of PORTRAIT_WIDTHS) {
    const target = `${directory}/${name.replace('.jpeg', '')}-${width}.webp`;
    let reusable = false;
    if (old?.sourceHash === sourceHash && old.outputs[String(width)]) {
      try { reusable = digest(await readFile(target)) === old.outputs[String(width)].hash; } catch { /* Regenerate missing files. */ }
    }
    if (!reusable) {
      const bytes = await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: settings.quality, effort: settings.effort }).toBuffer();
      const info = await sharp(bytes).metadata();
      if (info.width !== width) throw new Error(`Portrait is smaller than the declared width: ${name}`);
      await writeFile(target, bytes);
      generated++;
    }
    outputs[String(width)] = { bytes: (await stat(target)).size, hash: digest(await readFile(target)) };
  }
  images[name] = { sourceHash, outputs };
}
await writeFile(manifestPath, JSON.stringify({ configuration, images }, null, 2) + '\n');
console.log(JSON.stringify({ check: 'responsive-portraits', sources: Object.keys(images).length, generated, variants: PORTRAIT_WIDTHS.length }));
