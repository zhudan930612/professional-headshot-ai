import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import type { Manifest } from 'vite';
import { PUBLIC_PAGE_PATHS, SITE_URL } from '@/lib/seo';
import { renderDocument } from '@/prerender/document';
import { fetchPublicPlans } from '@/prerender/plans';
import { BLOG_PRESENTATION, getRelatedPosts } from '@/lib/blogPresentation';
import { BLOG_POSTS } from '@/constants';
import { SOCIAL_IMAGES, SOCIAL_WIDTH, SOCIAL_HEIGHT } from '@/lib/socialPreview';
import type { PublicPageData } from '@/types';
import type { ParsedBlog } from '@/utils/markdownParser';

const renderer = await import(pathToFileURL(path.resolve('dist-ssr/entry-server.js')).href) as {
  renderPublicPage(data: PublicPageData): Promise<string>;
  parseMarkdown(markdown: string): Promise<ParsedBlog>;
};
const template = await readFile('dist/index.html', 'utf8');
const manifest: Manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
const sitemapPaths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => {
  const url = new URL(match[1]);
  if (url.origin !== SITE_URL) throw new Error('Sitemap origin does not match the canonical site.');
  return url.pathname;
});
if (JSON.stringify([...sitemapPaths].sort()) !== JSON.stringify([...PUBLIC_PAGE_PATHS].sort())) throw new Error('The sitemap and prerender route list must contain exactly the same public pages.');

const plansSource = process.env.PRERENDER_PLANS_URL || `${SITE_URL}/api/plans`;
const socialManifest = JSON.parse(await readFile('scripts/assets/social-manifest.json', 'utf8')) as { rendererHash: string; fontHash: string; images: Record<string, { title: string; portrait: string; sourceHash: string; imageHash: string }> };
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
if (socialManifest.rendererHash !== digest((await readFile('scripts/create-social-images.ts', 'utf8')).replace(/\r\n/g, '\n')) || socialManifest.fontHash !== digest(await readFile('scripts/assets/Inter.ttf'))) throw new Error('Social renderer changed; run pnpm generate:social.');
for (const image of Object.values(SOCIAL_IMAGES)) {
  const bytes = await readFile(`public${image.path}`);
  const recorded = socialManifest.images[image.path];
  if (!recorded || recorded.title !== image.title || recorded.portrait !== image.portrait || recorded.imageHash !== digest(bytes) || recorded.sourceHash !== digest(await readFile(`public${image.portrait}`))) throw new Error(`Stale social image: ${image.path}; run pnpm generate:social.`);
  if (bytes.length > 1_000_000 || bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.readUInt32BE(16) !== SOCIAL_WIDTH || bytes.readUInt32BE(20) !== SOCIAL_HEIGHT) {
    throw new Error(`Missing or invalid social PNG: ${image.path}`);
  }
}
if (Object.keys(BLOG_PRESENTATION).length !== BLOG_POSTS.length) throw new Error('Blog presentation must cover every article.');
for (const post of BLOG_POSTS) {
  const presentation = BLOG_PRESENTATION[post.slug];
  if (!presentation || !presentation.coverAlt || new Set(presentation.related).size !== 2) throw new Error(`Invalid blog presentation: ${post.slug}`);
  getRelatedPosts(post.slug);
  if (!PUBLIC_PAGE_PATHS.includes(presentation.action.href)) throw new Error(`Invalid article action: ${post.slug}`);
  if (!/^\/best-headshot\/best_\d{2}\.jpeg$/.test(presentation.cover)) throw new Error('Unsafe cover path.');
  const cover = await readFile(`public${presentation.cover}`);
  if (cover[0] !== 0xff || cover[1] !== 0xd8) throw new Error(`Invalid JPEG: ${presentation.cover}`);
}
const plans = await fetchPublicPlans(plansSource);
const builtAt = new Date().toISOString();
const year = new Date(builtAt).getUTCFullYear();
const documents: Array<{ pathname: string; file: string; html: string }> = [];

function pageStyles(pathname: string): string[] {
  const name = pathname.startsWith('/blog/') ? 'BlogPost' : ({ '/': 'Home', '/linkedin-headshots': 'LinkedInHeadshots', '/pricing': 'Pricing', '/faq': 'FAQ', '/blog': 'Blog', '/privacy': 'Terms', '/terms': 'Terms' } as Record<string, string>)[pathname];
  const styles = new Set<string>();
  const seen = new Set<string>();
  const visit = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Missing client chunk: ${key}`);
    chunk.css?.forEach(style => styles.add(style));
    chunk.imports?.forEach(visit);
  };
  visit(`pages/${name}.tsx`);
  return [...styles];
}

for (const pathname of PUBLIC_PAGE_PATHS) {
  const data: PublicPageData = { pathname, year };
  if (pathname === '/pricing') data.plans = plans;
  if (pathname.startsWith('/blog/')) {
    const slug = pathname.slice('/blog/'.length);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Unsafe article path.');
    const parsed = await renderer.parseMarkdown(await readFile(`public/content/blog/${slug}.md`, 'utf8'));
    if (parsed.metadata.slug !== slug) throw new Error(`Article URL and metadata disagree: ${slug}`);
    data.post = { ...parsed.metadata, content: parsed.html };
  }
  const body = await renderer.renderPublicPage(data);
  if (!body.includes('<h1') || body.includes('Loading article...')) throw new Error(`Incomplete static page: ${pathname}`);
  const file = pathname === '/' ? 'index.html' : `${pathname.slice(1)}.html`;
  documents.push({ pathname, file, html: renderDocument(template, body, data, pageStyles(pathname)) });
}

// Keep private/auth routes independent of the pre-rendered homepage.
// A root 404.html makes Pages return HTTP 404 instead of its default SPA fallback.
const notFoundData: PublicPageData = { pathname: '/404', year, notFound: true };
await writeFile('dist/404.html', renderDocument(template, await renderer.renderPublicPage(notFoundData), notFoundData));
await writeFile('dist/app-shell.html', template.replace('</head>', '<meta name="robots" content="noindex, nofollow" />\n</head>'));
for (const document of documents) {
  const destination = path.join('dist', document.file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, document.html);
}
await writeFile('dist-ssr/prerender-report.json', JSON.stringify({ builtAt, plansSource, plans, pages: documents.map(({ pathname, file, html }) => ({ pathname, file, bytes: Buffer.byteLength(html) })) }, null, 2));
console.log(JSON.stringify({ check: 'public-prerender', pages: documents.length, publicPlans: plans.length, htmlBytes: documents.reduce((sum, document) => sum + Buffer.byteLength(document.html), 0) }));
