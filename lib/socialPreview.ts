import { BLOG_PRESENTATION } from '@/lib/blogPresentation';
import { SITE_NAME } from '@/lib/siteIdentity';

export const SOCIAL_WIDTH = 1200;
export const SOCIAL_HEIGHT = 630;
export interface SocialImage {
  path: string;
  title: string;
  portrait: string;
  alt: string;
}

export const SOCIAL_IMAGES: Record<string, SocialImage> = {
  default: { path: '/social/default.png', title: 'Professional\nHeadshot AI', portrait: '/best-headshot/best_12.jpeg', alt: 'Professional Headshot AI with an AI-generated portrait example' },
  home: { path: '/social/home.png', title: 'Your next\nprofessional\nheadshot', portrait: '/best-headshot/best_01.jpeg', alt: 'Your next professional headshot — AI portrait example' },
  linkedin: { path: '/social/linkedin.png', title: 'Headshots for\nyour LinkedIn\nprofile', portrait: '/best-headshot/best_12.jpeg', alt: 'Headshots for your LinkedIn profile — AI portrait example' },
  ...Object.fromEntries(Object.entries(BLOG_PRESENTATION).map(([slug, info]) => [slug, {
    path: `/social/${slug}.png`, title: info.displayTitle, portrait: info.cover,
    alt: `${info.displayTitle} — ${info.coverAlt}`,
  }])),
};

export function getSocialPreview(pathname: string, noIndex: boolean) {
  if (noIndex) return undefined;
  const slug = pathname.startsWith('/blog/') ? pathname.slice(6) : '';
  const key = pathname === '/' ? 'home' : pathname === '/linkedin-headshots' ? 'linkedin' : slug && SOCIAL_IMAGES[slug] ? slug : 'default';
  return { ...SOCIAL_IMAGES[key], type: slug && BLOG_PRESENTATION[slug] ? 'article' as const : 'website' as const };
}

export interface SocialMetaTag { key: string; content: string; property: boolean }
export const SOCIAL_META_KEYS = ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:image', 'og:image:secure_url', 'og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt'];

export function socialMetaTags(seo: { title: string; description: string; canonicalUrl?: string; social?: ReturnType<typeof getSocialPreview> }, baseUrl: string): SocialMetaTag[] {
  const values: Record<string, string> = {
    'og:title': seo.title, 'og:description': seo.description, 'og:type': seo.social?.type || 'website',
    'og:site_name': SITE_NAME,
    'twitter:card': seo.social ? 'summary_large_image' : 'summary',
    'twitter:title': seo.title, 'twitter:description': seo.description,
  };
  if (seo.canonicalUrl) values['og:url'] = seo.canonicalUrl;
  if (seo.social) Object.assign(values, {
    'og:image': `${baseUrl}${seo.social.path}`, 'og:image:secure_url': `${baseUrl}${seo.social.path}`,
    'og:image:type': 'image/png', 'og:image:width': String(SOCIAL_WIDTH), 'og:image:height': String(SOCIAL_HEIGHT),
    'og:image:alt': seo.social.alt, 'twitter:image': `${baseUrl}${seo.social.path}`, 'twitter:image:alt': seo.social.alt,
  });
  return Object.entries(values).map(([key, content]) => ({ key, content, property: key.startsWith('og:') }));
}
