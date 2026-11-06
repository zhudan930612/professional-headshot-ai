import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPageSeo, SITE_URL, type PageSeo } from '@/lib/seo';
import { socialMetaTags, SOCIAL_META_KEYS } from '@/lib/socialPreview';

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
    const tags = socialMetaTags(seo, SITE_URL);
    for (const key of SOCIAL_META_KEYS) {
      if (!tags.some(tag => tag.key === key)) document.querySelector(`meta[${key.startsWith('og:') ? 'property' : 'name'}="${key}"]`)?.remove();
    }
    tags.forEach(tag => setMeta(tag.key, tag.content, tag.property));
  }, [seo.title, seo.description, seo.canonicalUrl, seo.noIndex, seo.social?.path, seo.social?.alt, seo.social?.type]);

  return null;
};
