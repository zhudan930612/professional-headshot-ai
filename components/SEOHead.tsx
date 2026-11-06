import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPageSeo, type PageSeo } from '@/lib/seo';

export const SEOHead = ({ title, description, canonicalPath, noIndex }: Partial<PageSeo>) => {
  const { pathname } = useLocation();
  const seo = getPageSeo(pathname, { title, description, canonicalPath, noIndex });

  useEffect(() => {
    document.title = seo.title;
    const setMeta = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let tag = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, name);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };
    setMeta('description', seo.description);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical && seo.canonicalUrl) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    if (seo.canonicalUrl && canonical) canonical.href = seo.canonicalUrl;
    else canonical?.remove();
    if (seo.noIndex) setMeta('robots', 'noindex, nofollow');
    else document.querySelector('meta[name="robots"]')?.remove();
    setMeta('og:title', seo.title, true);
    setMeta('og:description', seo.description, true);
    if (seo.canonicalUrl) setMeta('og:url', seo.canonicalUrl, true);
    else document.querySelector('meta[property="og:url"]')?.remove();
    setMeta('og:type', 'website', true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', seo.title);
    setMeta('twitter:description', seo.description);
  }, [seo.title, seo.description, seo.canonicalUrl, seo.noIndex]);

  return null;
};
