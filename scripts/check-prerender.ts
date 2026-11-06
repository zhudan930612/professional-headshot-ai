import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { JSDOM } from 'jsdom';
import { PUBLIC_PAGE_PATHS, SITE_URL } from '@/lib/seo';
import type { PublicPageData } from '@/types';

const base = process.argv[2];
const titles = new Set<string>();
const publicLinks = new Map<string, string[]>();
const report = [];
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
  if (data.post) {
    assert.equal(document.querySelector('.blog-content')?.textContent?.trim(), new JSDOM(data.post.content).window.document.body.textContent?.trim());
    assert.ok((document.querySelector('.blog-content')?.textContent?.length || 0) > 1000);
    assert.ok([...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.getAttribute('href')?.includes('BlogPost-')), 'Article CSS must work without JavaScript.');
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
