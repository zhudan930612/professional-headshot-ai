// @vitest-environment jsdom
import React, { act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { generateHeadshots } from '@/services/generationService';
import { serializePublicData } from '@/prerender/document';
import { TEST_PLANS } from '@/prerender/fixtures';
import { PUBLIC_PAGE_PATHS, SITE_URL } from '@/lib/seo';
import type { PublicPageData } from '@/types';
import { BLOG_POSTS } from '@/constants';
import { getBlogPresentation } from '@/lib/blogPresentation';

vi.mock('@/services/authService', async original => ({
  ...await original<typeof import('@/services/authService')>(),
  initializeGoogleSignIn: vi.fn(async () => ({ prompt: vi.fn(), renderButton: vi.fn(), cancel: vi.fn() })),
}));
vi.mock('@/services/generationService', async original => ({
  ...await original<typeof import('@/services/generationService')>(),
  generateHeadshots: vi.fn(),
}));

let root: Root | undefined;
const recoveries: unknown[] = [];
let fetchMock: ReturnType<typeof vi.fn>;
let consoleErrors: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  recoveries.length = 0;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  fetchMock = vi.fn(async (input: string | URL | Request) => {
    const pathname = String(input);
    if (pathname === '/api/auth/session') return Response.json({ user: null });
    if (pathname === '/api/account') return Response.json({ error: 'Please sign in.' }, { status: 401 });
    if (pathname === '/api/plans') return Response.json(TEST_PLANS);
    if (pathname.startsWith('/content/blog/')) return new Response(await readFile(`public${pathname}`, 'utf8'));
    throw new Error(`Unexpected network request in hydration test: ${pathname}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  consoleErrors = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  expect(recoveries).toEqual([]);
  expect(consoleErrors.mock.calls.filter((args: unknown[]) => /hydration|did not match|server rendered|uncaught/i.test(String(args[0])))).toEqual([]);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(pathname: string, notFound = false) {
  // Use the actual build, keeping server/client rendering in separate processes.
  const file = notFound ? '404.html' : pathname === '/' ? 'index.html' : `${pathname.slice(1)}.html`;
  const html = await readFile(`dist/${file}`, 'utf8');
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const data: PublicPageData = JSON.parse(parsed.getElementById('__PUBLIC_PAGE_DATA__')!.textContent!);
  document.head.innerHTML = parsed.head.innerHTML;
  document.body.innerHTML = parsed.body.innerHTML;
  window.history.replaceState({}, '', pathname);
  const title = document.title;
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content');
  const main = document.querySelector('main');
  const heading = document.querySelector('h1')?.textContent;
  expect(main?.textContent?.length).toBeGreaterThan(150);
  expect(document.querySelectorAll('h1')).toHaveLength(1);
  expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(notFound ? 0 : 1);
  if (!notFound) expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}${pathname}`);
  await act(async () => {
    root = hydrateRoot(document.getElementById('root')!, <React.StrictMode><App initialData={data} /></React.StrictMode>, {
      onRecoverableError: error => recoveries.push(error),
    });
  });
  await vi.waitFor(async () => {
    await act(async () => {});
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/account')).toBe(true);
  });
  return { title, description, main, heading };
}

async function click(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  expect(element).not.toBeNull();
  await act(async () => element!.click());
}

describe('all public pages without JavaScript and after hydration', () => {
  it('uses real portrait previews when browsing the editorial index with focus', async () => {
    await mount('/blog');
    const link = document.querySelector<HTMLAnchorElement>('.journal-row[href="/blog/lighting-101-studio-vs-natural"]')!;
    await act(async () => link.focus());
    const source = getBlogPresentation('lighting-101-studio-vs-natural').cover;
    await vi.waitFor(async () => { await act(async () => {}); expect(document.querySelector(`.journal-preview img[src="${source}"]`)).not.toBeNull(); });
    expect(document.querySelector('.journal-preview img[data-active="true"]')?.getAttribute('src')).not.toBe(source);
    await act(async () => document.querySelector(`.journal-preview img[src="${source}"]`)!.dispatchEvent(new Event('load')));
    await vi.waitFor(async () => { await act(async () => {}); expect(document.querySelector('.journal-preview img[data-active="true"]')?.getAttribute('src')).toBe(source); });
  });
  it('ignores a preview that finishes loading after focus has moved away', async () => {
    await mount('/blog');
    const link = document.querySelector<HTMLAnchorElement>('.journal-row[href="/blog/lighting-101-studio-vs-natural"]')!;
    const source = getBlogPresentation('lighting-101-studio-vs-natural').cover;
    await act(async () => link.focus());
    await vi.waitFor(async () => { await act(async () => {}); expect(document.querySelector(`.journal-preview img[src="${source}"]`)).not.toBeNull(); });
    await act(async () => link.blur());
    await act(async () => document.querySelector(`.journal-preview img[src="${source}"]`)!.dispatchEvent(new Event('load')));
    expect(document.querySelector('.journal-preview img[data-active="true"]')?.getAttribute('src')).not.toBe(source);
  });
  it('does not switch previews when the pointer briefly sweeps over a row', async () => {
    await mount('/blog');
    const link = document.querySelector<HTMLAnchorElement>('.journal-row[href="/blog/lighting-101-studio-vs-natural"]')!;
    const original = document.querySelector('.journal-preview img[data-active="true"]')?.getAttribute('src');
    vi.useFakeTimers();
    try {
      await act(async () => { link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); await vi.advanceTimersByTimeAsync(100); });
      await act(async () => { link.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })); await vi.advanceTimersByTimeAsync(200); });
      expect(document.querySelectorAll('.journal-preview img')).toHaveLength(1);
      expect(document.querySelector('.journal-preview img[data-active="true"]')?.getAttribute('src')).toBe(original);
    } finally { vi.useRealTimers(); }
  });
  it.each(BLOG_POSTS.map(post => post.slug))('follows the related reading from %s with matching cover and canonical', async slug => {
    await mount(`/blog/${slug}`);
    const presentation = getBlogPresentation(slug);
    expect(document.querySelector('article figure img')?.getAttribute('src')).toBe(presentation.cover);
    expect(document.querySelectorAll('nav[aria-label="Related articles"] a')).toHaveLength(2);
    const contents = [...document.querySelectorAll('nav[aria-label="Article contents"] a')];
    expect(contents.length).toBeGreaterThan(0);
    for (const link of contents) expect(document.getElementById(link.getAttribute('href')!.slice(1))).not.toBeNull();
    expect(document.querySelector('.blog-content')?.textContent).not.toMatch(/\p{Extended_Pictographic}|Why this matters/u);
    const target = presentation.related[0];
    await click(`nav[aria-label="Related articles"] a[href="/blog/${target}"]`);
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/blog/${target}`);
      expect(document.querySelector('article figure img')?.getAttribute('src')).toBe(getBlogPresentation(target).cover);
    });
  });

  it.each(['/missing-page', '/blog/missing-article', '/nested/path/missing/'])('hydrates a real 404 at %s and can navigate back to a valid page', async pathname => {
    const before = await mount(pathname, true);
    expect(document.querySelector('main')).toBe(before.main);
    expect(document.title).toBe('Page Not Found – Professional Headshot AI');
    expect(document.querySelector('h1')?.textContent).toBe('Page not found');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    await click('main a[href="/blog"]');
    await vi.waitFor(async () => { await act(async () => {}); expect(document.title).toBe('Blog – Professional Headshot AI'); });
    expect(document.title).toBe('Blog – Professional Headshot AI');
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/blog`);
  });

  it('shows noindex and clears the previous canonical on client navigation to a missing article', async () => {
    await mount('/blog');
    await act(async () => {
      window.history.pushState({}, '', '/blog/missing-article');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await vi.waitFor(async () => { await act(async () => {}); expect(document.title).toBe('Page Not Found – Professional Headshot AI'); });
    expect(document.querySelector('h1')?.textContent).toBe('Page not found');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('missing-article.md'))).toBe(false);
  });

  it.each(PUBLIC_PAGE_PATHS)('%s keeps its body and unique metadata when React takes over', async pathname => {
    const before = await mount(pathname);
    expect(document.querySelector('main')).toBe(before.main);
    expect(document.querySelector('h1')?.textContent).toBe(before.heading);
    expect(document.title).toBe(before.title);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(before.description);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}${pathname}`);
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.body.textContent).not.toContain('Loading article...');
    if (pathname.startsWith('/blog/')) expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/content/blog/'))).toBe(false);
  });

  it('updates metadata on client navigation between articles and the pricing page', async () => {
    await mount('/blog');
    await click('a[href="/blog/what-to-wear-for-a-professional-headshot"]');
    await act(async () => { await vi.waitFor(() => expect(document.title).toContain('What to Wear')); });
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/blog/what-to-wear-for-a-professional-headshot`);
    await click('a[href="/blog"]');
    await click('a[href="/blog/top-5-mistakes-in-resume-photos"]');
    await act(async () => { await vi.waitFor(() => expect(document.title).toContain('Top 5 Mistakes')); });
    await click('a[href="/pricing"]');
    expect(document.title).toBe('Pricing – Professional Headshot AI');
    expect(document.querySelector('main')?.textContent).toContain('$25');
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  it('opens login from the hydrated home page and preserves its return path', async () => {
    await mount('/');
    const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Create Headshots Free');
    expect(button).toBeDefined();
    await act(async () => button!.click());
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Sign in to Professional Headshot AI');
    expect(localStorage.getItem('auth_return_path')).toBe('/');
    await click('button[aria-label="Close sign in"]');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('refreshes a static price from the API and requires login before checkout', async () => {
    fetchMock.mockImplementation(async (url: string) => Response.json(url === '/api/plans'
      ? TEST_PLANS.map(plan => ({ ...plan, price: plan.id === 'professional' ? 29 : plan.price }))
      : { user: null }));
    await mount('/pricing');
    expect(document.querySelector('main')?.textContent).toContain('$29');
    const upgrade = [...document.querySelectorAll('button')].find(item => item.textContent === 'Upgrade Now');
    await act(async () => upgrade!.click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(localStorage.getItem('auth_return_path')).toBe('/pricing');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('create-payment'))).toBe(false);
  });

  it.each(['/', '/linkedin-headshots'])('restores a signed-in session and runs the generation result UI on %s', async pathname => {
    const user = { id: 'seo-local-user', email: 'seo@example.invalid', user_metadata: { name: 'SEO Tester' } };
    const quota = { plan_type: 'professional', total_quota: 30, remaining_quota: 30, used_quota: 0, is_paid: true, quality: '1K', has_watermark: false };
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/auth/session') return Response.json({ user });
      if (url === '/api/account') return Response.json({ quota, subscription: null });
      if (url === '/api/history') return Response.json({ saved: true });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.mocked(generateHeadshots).mockResolvedValue([{ id: 'seo-image', url: '/seo-result.png', createdAt: 1 }]);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:seo-test') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    await mount(pathname);
    expect(document.body.textContent).toContain('SEO Tester');
    const file = new File(['local fixture'], 'headshot.jpg', { type: 'image/jpeg' });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [file] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    expect(document.body.textContent).toContain('1 photos selected');
    const next = [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Next'));
    expect(next?.disabled).toBe(false);
    await act(async () => next!.click());
    expect(document.body.textContent).toContain('Step 2: Choose Your Style');
    const toolSelector = pathname === '/' ? '#upload-tool' : '#linkedin-generator';
    const style = document.querySelector<HTMLImageElement>(`${toolSelector} img[alt^="AI-generated"]`)!.parentElement!;
    await act(async () => style.click());
    const generate = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Generate (1)');
    expect(generate?.disabled).toBe(false);
    await act(async () => {
      generate!.click();
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(generateHeadshots).toHaveBeenCalledWith(file, expect.any(Array), expect.any(String), user.id, expect.any(String), undefined, expect.any(Function));
    expect(document.querySelector('img[alt="Result"]')?.getAttribute('src')).toBe('/seo-result.png');
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/history')).toBe(true);
  });

  it('switches LinkedIn examples and keeps the generator destination through login', async () => {
    await mount('/linkedin-headshots');
    const sample = [...document.querySelectorAll('button')].find(button => button.textContent === 'Business casual');
    await act(async () => sample!.click());
    expect(sample?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('figure img')?.getAttribute('src')).toBe('/best-headshot/best_12.jpeg');
    await click('a[href="#linkedin-generator"]');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(localStorage.getItem('auth_return_path')).toBe('/linkedin-headshots#linkedin-generator');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('create-payment') || String(url).includes('nanoBanana'))).toBe(false);
  });

  it('safely serializes article text containing closing script tags', () => {
    const data = { pathname: '/', year: 2026, post: { content: '</script><script>alert(1)</script>\u2028' } } as PublicPageData;
    const serialized = serializePublicData(data);
    expect(serialized).not.toContain('</script>');
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
