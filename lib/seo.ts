import { BLOG_POSTS } from '@/constants';
import { getSocialPreview } from '@/lib/socialPreview';
import { SITE_URL } from '@/lib/siteIdentity';

export { SITE_URL } from '@/lib/siteIdentity';

export interface PageSeo {
  title: string;
  description: string;
  canonicalPath?: string | null;
  noIndex?: boolean;
}

const PAGE_SEO: Record<string, PageSeo> = {
  '/linkedin-headshots': {
    title: 'AI LinkedIn Headshots from Your Selfies | Professional Headshot AI',
    description: 'Create a professional LinkedIn profile photo from your selfies. Explore AI headshot examples, check your framing, and choose a style that fits your work.',
  },
  '/': {
    title: 'Professional Headshot AI – Headshots That Look Like You',
    description: 'Create realistic AI professional headshots that actually look like you. Upload photos, choose a style, and get studio-quality results in minutes.',
  },
  '/pricing': {
    title: 'Pricing – Professional Headshot AI',
    description: 'Compare one-time AI headshot packages, generation credits, image quality, and watermark options. Start with free generations on signup. No credit card required.',
  },
  '/faq': {
    title: 'FAQ – Professional Headshot AI',
    description: 'Frequently asked questions about AI professional headshots. Learn how it works, photo requirements, delivery time, and more.',
  },
  '/blog': {
    title: 'Blog – Professional Headshot AI',
    description: 'Tips, guides, and insights about professional headshots, career branding, and AI photography technology.',
  },
  '/terms': {
    title: 'Terms of Service – Professional Headshot AI',
    description: 'Terms and conditions for using Professional Headshot AI services.',
  },
  '/privacy': {
    title: 'Privacy Policy – Professional Headshot AI',
    description: 'How we collect, use, and protect your personal information at Professional Headshot AI.',
  },
  '/history': {
    title: 'My History – Professional Headshot AI',
    description: 'View and manage your generated AI headshots.',
  },
  '/subscription': {
    title: 'My Subscription – Professional Headshot AI',
    description: 'Manage your Professional Headshot AI subscription and credits.',
  },
};

export const NOT_FOUND_SEO: PageSeo = {
  title: 'Page Not Found – Professional Headshot AI',
  description: 'This page could not be found. Return to the headshot generator or browse our headshot guides.',
  noIndex: true,
  canonicalPath: null,
};

export const PUBLIC_PAGE_PATHS = [
  '/', '/linkedin-headshots', '/pricing', '/faq', '/blog',
  ...BLOG_POSTS.map(post => `/blog/${post.slug}`),
  '/privacy', '/terms',
];

export const normalizePagePath = (pathname: string): string => pathname.replace(/\/+$/, '') || '/';

export const getPageSeo = (pathname: string, overrides: Partial<PageSeo> = {}) => {
  const pagePath = normalizePagePath(pathname);
  const post = BLOG_POSTS.find(item => `/blog/${item.slug}` === pagePath);
  const defaults = post ? {
    title: `${post.title} – Professional Headshot AI Blog`,
    description: post.excerpt,
  } : PAGE_SEO[pagePath] || PAGE_SEO['/'];
  return {
    title: overrides.title || defaults.title,
    description: overrides.description || defaults.description,
    canonicalUrl: overrides.canonicalPath === null ? undefined : `${SITE_URL}${normalizePagePath(overrides.canonicalPath || pagePath)}`,
    noIndex: overrides.noIndex ?? false,
    social: PUBLIC_PAGE_PATHS.includes(pagePath) ? getSocialPreview(pagePath, overrides.noIndex ?? false) : undefined,
  };
};
