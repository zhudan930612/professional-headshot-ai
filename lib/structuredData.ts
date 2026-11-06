import { SITE_NAME, SITE_URL } from '@/lib/siteIdentity';

export const WEBSITE_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
};

export function serializeStructuredData(data: unknown): string {
  // JSON is embedded in a raw-text script element, so HTML escaping is insufficient.
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
