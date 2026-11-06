import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { JSDOM } from 'jsdom';
import { PUBLIC_PAGE_PATHS, SITE_URL } from '@/lib/seo';
import type { PublicPageData } from '@/types';
import { getBlogPresentation } from '@/lib/blogPresentation';
import { getPageSeo } from '@/lib/seo';
import { socialMetaTags } from '@/lib/socialPreview';
import { portraitImageProps } from '@/lib/responsiveImages';
import sharp from 'sharp';

const base = process.argv[2];
const titles = new Set<string>();
const publicLinks = new Map<string, string[]>();
const report = [];
let homepageFooter: string | undefined;
const checkedPortraits = new Set<string>();
for (const pathname of PUBLIC_PAGE_PATHS) {
  const file = pathname === '/' ? 'index.html' : `${pathname.slice(1)}.html`;
  let html: string;
  if (base) {
    const response = await fetch(new URL(pathname, base), { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    assert.equal(response.status, 200, `${pathname} must resolve directly to HTTP 200`);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    html = await response.text();
  } else html = await readFile(`dist/${file}`, 'utf8');
  const dom = new JSDOM(html); // Scripts are deliberately disabled.
  const document = dom.window.document;
  for (const portrait of document.querySelectorAll('img[src^="/optimized/portraits/"]')) {
    assert.ok(portrait.getAttribute('width') && portrait.getAttribute('height'), 'Portraits reserve layout space.');
    assert.ok(portrait.getAttribute('sizes'), 'Responsive portraits declare their display size.');
    const candidates = portrait.getAttribute('srcset')!.split(', ');
    assert.equal(candidates.length, 5);
    for (const candidate of candidates) {
      const [path, descriptor] = candidate.split(' ');
      if (checkedPortraits.has(path)) continue;
      let bytes: Buffer;
      if (base) {
        const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(10_000) });
        assert.equal(response.status, 200, path);
        assert.match(response.headers.get('content-type') || '', path.endsWith('.jpeg') ? /image\/jpeg/ : /image\/webp/);
        bytes = Buffer.from(await response.arrayBuffer());
      } else bytes = await readFile(`dist${path}`);
      const metadata = await sharp(bytes).metadata();
      assert.equal(metadata.format, path.endsWith('.jpeg') ? 'jpeg' : 'webp');
      assert.equal(metadata.width, Number.parseInt(descriptor));
      checkedPortraits.add(path);
    }
  }
  const seo = getPageSeo(pathname);
  for (const tag of socialMetaTags(seo, SITE_URL)) {
    const matches = document.querySelectorAll(`meta[${tag.property ? 'property' : 'name'}="${tag.key}"]`);
    assert.equal(matches.length, 1, `${pathname}: one ${tag.key}`);
    const expected = tag.key.endsWith(':title') ? document.title : tag.key.endsWith(':description')
      ? document.querySelector('meta[name="description"]')?.getAttribute('content') : tag.content;
    assert.equal(matches[0].getAttribute('content'), expected);
  }
  const imageUrl = new URL(document.querySelector('meta[property="og:image"]')!.getAttribute('content')!);
  assert.equal(imageUrl.origin, SITE_URL);
  let image: Buffer;
  if (base) {
    const response = await fetch(new URL(imageUrl.pathname, base), { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /image\/png/);
    image = Buffer.from(await response.arrayBuffer());
  } else image = await readFile(`dist${imageUrl.pathname}`);
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  const footer = document.querySelector('footer')?.outerHTML;
  assert.ok(footer, 'Public pages must include the shared footer.');
  if (pathname === '/') homepageFooter = footer;
  if (pathname === '/blog' || pathname.startsWith('/blog/')) assert.equal(footer, homepageFooter, 'Blog footer must match the homepage.');
  publicLinks.set(pathname, [...document.querySelectorAll('a[href]')].flatMap(link => {
    const url = new URL(link.getAttribute('href')!, `${SITE_URL}${pathname}`);
    const target = url.pathname.replace(/\/+$/, '') || '/';
    return url.origin === SITE_URL && PUBLIC_PAGE_PATHS.includes(target) ? [target] : [];
  }));
  assert.equal(document.querySelectorAll('h1').length, 1, `${pathname}: one visible page heading`);
  assert.ok((document.querySelector('main')?.textContent?.trim().length || 0) > 150, `${pathname}: static body`);
  assert.equal(document.querySelectorAll('title').length, 1);
  assert.ok(document.title && !titles.has(document.title), `${pathname}: unique title`);
  titles.add(document.title);
  assert.equal(document.querySelectorAll('meta[name="description"]').length, 1);
  assert.ok(document.querySelector('meta[name="description"]')?.getAttribute('content'));
  assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
  assert.equal(document.querySelector('link[rel="canonical"]')?.getAttribute('href'), `${SITE_URL}${pathname}`);
  assert.equal(document.querySelector('meta[name="robots"]'), null);
  const data: PublicPageData = JSON.parse(document.getElementById('__PUBLIC_PAGE_DATA__')!.textContent!);
  assert.equal(data.pathname, pathname);
  const structuredScripts = document.querySelectorAll('script[type="application/ld+json"]');
  assert.equal(structuredScripts.length, pathname === '/' || data.post ? 1 : 0, `${pathname}: structured data belongs to this route`);
  if (pathname === '/') {
    const website = JSON.parse(structuredScripts[0].textContent!);
    assert.deepEqual(website, {
      '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_URL}/#website`,
      name: 'Professional Headshot AI', url: `${SITE_URL}/`,
    });
    assert.equal(website.url, document.querySelector('link[rel="canonical"]')?.getAttribute('href'));
    assert.equal(website.name, document.querySelector('meta[property="og:site_name"]')?.getAttribute('content'));
    assert.equal(document.querySelector('nav a[href="/"][aria-label]')?.getAttribute('aria-label'), `${website.name} home`);
  }
  if (data.post) {
    const presentation = getBlogPresentation(data.post.slug);
    const structured = JSON.parse(structuredScripts[0].textContent!);
    assert.equal(structured['@context'], 'https://schema.org');
    assert.equal(structured['@graph'].length, 2);
    const [article, breadcrumb] = structured['@graph'];
    assert.equal(article['@type'], 'BlogPosting');
    assert.equal(article.url, `${SITE_URL}${pathname}`);
    assert.equal(article['@id'], `${article.url}#article`);
    assert.equal(article.mainEntityOfPage['@id'], article.url);
    assert.equal(article.headline, document.querySelector('h1')?.textContent);
    assert.equal(article.description, document.querySelector('.article-heading>p')?.textContent);
    assert.equal(article.datePublished, document.querySelector('time')?.getAttribute('datetime'));
    assert.equal(article.datePublished, data.post.date);
    assert.equal(article.image, `${SITE_URL}${presentation.cover}`);
    assert.ok(!('author' in article) && !('dateModified' in article), 'Do not invent article attribution or modification dates.');
    assert.equal(breadcrumb['@type'], 'BreadcrumbList');
    const trail = [...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')];
    assert.equal(trail.length, 3);
    assert.equal(trail[2].querySelector('[aria-current="page"]')?.textContent, article.headline);
    assert.deepEqual(breadcrumb.itemListElement, trail.map((item, index) => ({
      '@type': 'ListItem', position: index + 1,
      name: item.querySelector('a, [aria-current]')!.textContent,
      item: `${SITE_URL}${item.querySelector('a')?.getAttribute('href') ?? pathname}`,
    })));
    assert.equal(document.querySelector('article figure img')?.getAttribute('src'), portraitImageProps(presentation.cover, '36vw').src);
    const recommendations = [...document.querySelectorAll('nav[aria-label="Related articles"] a')].map(link => link.getAttribute('href'));
    assert.deepEqual(recommendations, presentation.related.map(slug => `/blog/${slug}`));
    assert.equal(document.querySelectorAll('img[src*="picsum.photos"]').length, 0);
    assert.equal(document.querySelectorAll('main img[src$=".svg"], .blog-content hr').length, 0);
    assert.ok(!/\p{Extended_Pictographic}/u.test(document.querySelector('.blog-content')?.textContent || ''));
    for (const link of document.querySelectorAll('nav[aria-label="Article contents"] a')) {
      assert.ok(document.getElementById(link.getAttribute('href')!.slice(1)), 'Contents must link to a real heading.');
    }
    assert.equal(document.querySelector('.blog-content')?.textContent?.trim(), new JSDOM(data.post.content).window.document.body.textContent?.trim());
    assert.ok((document.querySelector('.blog-content')?.textContent?.length || 0) > 1000);
    assert.ok([...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.getAttribute('href')?.includes('BlogPost-')), 'Article CSS must work without JavaScript.');
  }
  if (pathname === '/blog') {
    assert.ok(document.querySelectorAll('main img[src^="/optimized/portraits/"]').length >= 8);
    assert.equal(document.querySelectorAll('main img[src*="picsum.photos"]').length, 0);
  }
  if (data.plans) for (const plan of data.plans) assert.ok(document.querySelector('main')?.textContent?.includes(`$${plan.price}`));
  assert.ok(!html.includes('Loading article...'));
  report.push({ pathname, bytes: Buffer.byteLength(html), gzipBytes: gzipSync(html).length });
  dom.window.close();
}
// Prove discoverability from rendered anchors, without relying on JavaScript or sitemap submission.
const reachable = new Map<string, number>([['/', 0]]);
for (const [page, depth] of reachable) {
  for (const target of publicLinks.get(page) || []) {
    if (!reachable.has(target)) reachable.set(target, depth + 1);
  }
}
assert.deepEqual(PUBLIC_PAGE_PATHS.filter(page => !reachable.has(page)), [], 'Public pages must be reachable from the homepage using static links.');
console.log(JSON.stringify({ check: 'static-link-discovery', reachable: reachable.size, maximumClicksFromHome: Math.max(...reachable.values()) }));

const privatePaths = ['/history', '/history/', '/subscription', '/subscription/', '/auth/callback', '/auth/callback/'];
for (const pathname of base ? privatePaths : ['/app-shell']) {
  let html: string;
  if (base) {
    const response = await fetch(new URL(`${pathname}?seo-check=1`, base), { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    assert.equal(response.status, 200, `${pathname}: app-shell rewrite must not redirect the browser`);
    assert.equal(response.headers.get('location'), null, `${pathname}: retain the original account/callback URL`);
    html = await response.text();
  } else html = await readFile('dist/app-shell.html', 'utf8');
  const dom = new JSDOM(html);
  assert.equal(dom.window.document.querySelector('meta[name="robots"]')?.getAttribute('content'), 'noindex, nofollow');
  assert.equal(dom.window.document.getElementById('__PUBLIC_PAGE_DATA__'), null, 'Private routes must not receive a public page snapshot.');
  assert.equal(dom.window.document.getElementById('root')?.childNodes.length, 0);
  assert.equal(dom.window.document.querySelector('script[type="application/ld+json"]'), null);
  dom.window.close();
}
const missingPaths = ['/seo-missing-page', '/seo-missing-page/', '/blog/seo-missing-article', '/blog/seo-missing-article/', '/nested/missing/page?source=test'];
for (const pathname of base ? missingPaths : ['/404']) {
  let html: string;
  if (base) {
    const url = new URL(pathname, base);
    const response = await fetch(url, { redirect: 'manual' });
    assert.equal(response.status, 404, `${pathname}: real HTTP 404`);
    assert.equal(response.headers.get('location'), null);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    html = await response.text();
    const head = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    assert.equal(head.status, 404);
    assert.equal(await head.text(), '');
  } else html = await readFile('dist/404.html', 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  assert.equal(doc.querySelector('h1')?.textContent, 'Page not found');
  assert.match(doc.title, /Page Not Found/);
  assert.match(doc.querySelector('meta[name="robots"]')?.getAttribute('content') || '', /noindex/);
  assert.equal(doc.querySelector('link[rel="canonical"]'), null);
  assert.equal(doc.querySelector('meta[property="og:image"]'), null);
  assert.equal(doc.querySelector('meta[name="twitter:image"]'), null);
  assert.equal(doc.querySelector('script[type="application/ld+json"]'), null);
  assert.ok(doc.querySelector('main a[href="/"]'));
  assert.ok(doc.querySelector('main a[href="/blog"]'));
  dom.window.close();
}
if (base) {
  for (const [pathname, status] of [['/api/health', 200], ['/api/plans', 200], ['/api/account', 401], ['/api/seo-missing-endpoint', 404]] as const) {
    const response = await fetch(new URL(pathname, base), { redirect: 'manual' });
    assert.equal(response.status, status, pathname);
    assert.match(response.headers.get('content-type') || '', /application\/json/);
    await response.json();
  }
}
console.log(JSON.stringify({ check: 'prerendered-pages', source: base || 'dist', javascript: 'disabled', passed: report.length, privateRoutes: base ? privatePaths.length : 'shell verified', notFound: base ? missingPaths.length : '404 verified', pages: report }, null, 2));
