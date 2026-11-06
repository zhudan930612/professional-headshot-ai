import { describe, expect, it } from 'vitest';
import { BLOG_POSTS } from '@/constants';
import { getBlogStructuredData, serializeStructuredData } from './blogStructuredData';

describe('article structured data', () => {
  it('preserves the recorded date without inventing an author or modification date', () => {
    const data = getBlogStructuredData({ ...BLOG_POSTS[0], date: '2024-02-29' });
    const article = data['@graph'][0];
    expect(article.datePublished).toBe('2024-02-29');
    expect(article).not.toHaveProperty('author');
    expect(article).not.toHaveProperty('dateModified');
    expect(article).not.toHaveProperty('aggregateRating');
  });
  it.each(['2023-02-29', '2024-13-01', '2024-04-31', 'yesterday', '2024-1-1'])('rejects an invalid source date: %s', date => {
    expect(() => getBlogStructuredData({ ...BLOG_POSTS[0], date })).toThrow('Invalid article publication date');
  });
  it('prevents text from closing the JSON-LD script while preserving its value', () => {
    const data = { headline: '</script><script>alert("x")</script> & résumé\u2028\u2029' };
    const serialized = serializeStructuredData(data);
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
