import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchImage, validateImageUrl } from './images';

afterEach(() => vi.unstubAllGlobals());
describe('image URL and download boundary', () => {
  it('checks the hostname, HTTPS, credentials and ports', () => {
    for (const url of ['https://evil.test/?evolink.ai', 'https://evolink.ai.evil.test/x', 'http://evolink.ai/x', 'https://u:p@evolink.ai/x', 'https://evolink.ai:8080/x']) {
      expect(() => validateImageUrl(url, {})).toThrow();
    }
    expect(validateImageUrl('https://cdn.evolink.ai/image.png', {}).hostname).toBe('cdn.evolink.ai');
  });
  it('blocks redirects to an unapproved host before fetching it', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: 'https://evil.test/x' } }));
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchImage('https://evolink.ai/x', {})).rejects.toThrow('Image source');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects HTML disguised as an image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<script>bad</script>', { headers: { 'Content-Type': 'image/png' } })));
    await expect(fetchImage('https://evolink.ai/x', {})).rejects.toThrow('Unsupported image');
  });
  it('uses detected bytes to preserve the correct file format', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array([255,216,255,224]), { headers: { 'Content-Type': 'image/png' } })));
    await expect(fetchImage('https://evolink.ai/x', {})).resolves.toMatchObject({ mime: 'image/jpeg', extension: 'jpg' });
  });
  it('rejects oversized upstream payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('data', { headers: { 'Content-Length': String(21 * 1024 * 1024) } })));
    await expect(fetchImage('https://evolink.ai/x', {})).rejects.toThrow('too large');
  });
});
