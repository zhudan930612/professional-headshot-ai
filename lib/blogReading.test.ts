import { describe, expect, it } from 'vitest';
import { formatReadingHtml, getArticleSections, prepareReadingMarkdown } from './blogReading';

describe('editorial reading format', () => {
  it('removes decoration while retaining the advice underneath it', () => {
    const result = prepareReadingMarkdown('## 👔 Clothing\n• Choose a blazer\n\n---\n\n💡 **Why this matters**\nKeep your face visible.');
    expect(result).toContain('## Clothing');
    expect(result).toContain('- Choose a blazer');
    expect(result).toContain('Keep your face visible.');
    expect(result).not.toMatch(/👔|💡|Why this matters|---/);
  });
  it('provides stable unique section anchors and preserves nested emphasis', () => {
    const html = formatReadingHtml('<h2>🎨 Color</h2><p>Keep <strong>your face</strong> visible.</p><h2>Color</h2>');
    expect(getArticleSections(html)).toEqual([{ id: 'section-1', title: 'Color' }, { id: 'section-2', title: 'Color' }]);
    expect(html).toContain('<strong>your face</strong>');
    expect(formatReadingHtml(html)).toBe(html);
  });
});
