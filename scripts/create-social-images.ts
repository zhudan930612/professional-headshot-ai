import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { SOCIAL_IMAGES, SOCIAL_WIDTH, SOCIAL_HEIGHT } from '@/lib/socialPreview';

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
function lines(title: string): string[] {
  if (title.includes('\n')) return title.split('\n');
  const result: string[] = [];
  for (const word of title.split(' ')) {
    const last = result.length - 1;
    if (last >= 0 && `${result[last]} ${word}`.length <= 19) result[last] += ` ${word}`;
    else result.push(word);
  }
  if (result.length > 3) throw new Error(`Share title is too long: ${title}`);
  return result;
}

await mkdir('public/social', { recursive: true });
const digest = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
const manifest = { rendererHash: digest((await readFile('scripts/create-social-images.ts', 'utf8')).replace(/\r\n/g, '\n')), fontHash: digest(await readFile('scripts/assets/Inter.ttf')), images: {} as Record<string, { title: string; portrait: string; sourceHash: string; imageHash: string }> };
for (const image of Object.values(SOCIAL_IMAGES)) {
  const portraitBytes = await readFile(`public${image.portrait}`);
  const portrait = portraitBytes.toString('base64');
  const titleLines = lines(image.title);
  const startY = 250 - (titleLines.length - 1) * 34;
  const title = titleLines.map((line, i) => `<text x="64" y="${startY + i * 78}" font-size="68" font-weight="600">${escape(line)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SOCIAL_WIDTH}" height="${SOCIAL_HEIGHT}" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#ffffff"/>
    <rect x="0" y="0" width="1200" height="12" fill="#2563eb"/>
    <g font-family="Inter" fill="#182531">${image.path === SOCIAL_IMAGES.default.path ? '' : '<text x="64" y="88" font-size="27">Professional Headshot AI</text>'}${title}<text x="64" y="555" font-size="22" fill="#52616e">professionalheadshotai.ink</text></g>
    <svg x="730" y="12" width="470" height="618" viewBox="0 0 896 1200" preserveAspectRatio="xMidYMid slice"><image href="data:image/jpeg;base64,${portrait}" width="896" height="1200"/></svg>
    <rect x="730" y="584" width="470" height="46" fill="#182531"/>
    <text x="754" y="614" font-family="Inter" font-size="19" fill="#ffffff">AI-generated portrait example</text>
  </svg>`;
  const renderer = new Resvg(svg, { font: { fontFiles: ['scripts/assets/Inter.ttf'], loadSystemFonts: false, defaultFontFamily: 'Inter' } });
  const png = renderer.render().asPng();
  await writeFile(`public${image.path}`, png);
  manifest.images[image.path] = { title: image.title, portrait: image.portrait, sourceHash: digest(portraitBytes), imageHash: digest(png) };
  console.log(`${image.path}: ${png.length} bytes`);
}
await writeFile('scripts/assets/social-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
