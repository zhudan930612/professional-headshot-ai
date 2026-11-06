import { describe, expect, it } from 'vitest';
import { getPageSeo, SITE_URL, NOT_FOUND_SEO } from './seo';
import { socialMetaTags } from './socialPreview';

describe('social preview routing', () => {
  it('distinguishes a blog index from an article and normalizes trailing slashes', () => {
    expect(getPageSeo('/blog').social?.type).toBe('website');
    expect(getPageSeo('/blog/top-5-mistakes-in-resume-photos/').social?.type).toBe('article');
    expect(getPageSeo('/linkedin-headshots/').social?.path).toBe('/social/linkedin.png');
  });
  it.each(['/history', '/auth/callback', '/missing', '/blog/missing'])('does not attach a public photo to %s', pathname => {
    expect(getPageSeo(pathname, { noIndex: true }).social).toBeUndefined();
  });
  it('does not emit stale article or image fields for error pages', () => {
    const tags = socialMetaTags(getPageSeo('/missing', NOT_FOUND_SEO), SITE_URL);
    expect(tags.find(tag => tag.key === 'og:type')?.content).toBe('website');
    expect(tags.some(tag => tag.key.includes('image') || tag.key === 'og:url')).toBe(false);
  });
});
