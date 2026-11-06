import { getPageSeo, NOT_FOUND_SEO, SITE_URL } from '@/lib/seo';
import { socialMetaTags } from '@/lib/socialPreview';
import type { PublicPageData } from '@/types';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

export const serializePublicData = (data: PublicPageData): string => JSON.stringify(data)
  .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export function renderDocument(template: string, body: string, data: PublicPageData, styles: string[] = []): string {
  if (!template.includes('<div id="root"></div>')) throw new Error('The HTML template is missing the empty React root.');
  const seo = getPageSeo(data.pathname, data.notFound ? NOT_FOUND_SEO : data.post ? {
    title: `${data.post.title} – Professional Headshot AI Blog`, description: data.post.excerpt,
  } : {});
  const tags = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    ...(seo.canonicalUrl ? [`<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />`] : []),
    ...(seo.noIndex ? ['<meta name="robots" content="noindex, nofollow" />'] : []),
    ...socialMetaTags(seo, SITE_URL).map(tag => `<meta ${tag.property ? 'property' : 'name'}="${tag.key}" content="${escapeHtml(tag.content)}" />`),
    ...styles.filter(style => !template.includes(`href="/${style}"`)).map(style => `<link rel="stylesheet" href="/${escapeHtml(style)}" />`),
  ].join('\n    ');
  return template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', () => `${tags}\n</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>\n<script id="__PUBLIC_PAGE_DATA__" type="application/json">${serializePublicData(data)}</script>`);
}
