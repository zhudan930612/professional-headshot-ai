import { getBlogPresentation } from '@/lib/blogPresentation';
import { SITE_URL } from '@/lib/siteIdentity';
import type { BlogPost } from '@/types';

export function getBlogBreadcrumbs(slug: string) {
  return [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: getBlogPresentation(slug).displayTitle, path: `/blog/${slug}` },
  ];
}

export function getBlogStructuredData(post: BlogPost) {
  const presentation = getBlogPresentation(post.slug);
  const url = `${SITE_URL}/blog/${post.slug}`;
  // Preserve the source's date precision; never substitute the build date.
  const date = new Date(`${post.date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== post.date) {
    throw new Error(`Invalid article publication date: ${post.slug}`);
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        headline: presentation.displayTitle,
        description: presentation.summary,
        image: `${SITE_URL}${presentation.cover}`,
        datePublished: post.date,
        inLanguage: 'en',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: getBlogBreadcrumbs(post.slug).map((item, index) => ({
          '@type': 'ListItem', position: index + 1, name: item.name, item: `${SITE_URL}${item.path}`,
        })),
      },
    ],
  };
}
