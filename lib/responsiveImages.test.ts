import { describe, expect, it } from 'vitest';
import { portraitImageProps } from './responsiveImages';

describe('marketing portrait sources', () => {
  it('provides width candidates and the display size for browser selection', () => {
    expect(portraitImageProps('/best-headshot/best_01.jpeg', '256px')).toEqual({
      src: '/optimized/portraits/best_01-640.webp',
      srcSet: '/optimized/portraits/best_01-192.webp 192w, /optimized/portraits/best_01-384.webp 384w, /optimized/portraits/best_01-640.webp 640w, /optimized/portraits/best_01-768.webp 768w, /best-headshot/best_01.jpeg 896w',
      sizes: '256px',
    });
  });
  it.each(['/api/media/photo', 'blob:local-upload', '/samples/upload.jpg', 'https://example.com/best-headshot/best_01.jpeg'])(
    'preserves other image sources: %s', source => {
      expect(portraitImageProps(source, '256px')).toEqual({ src: source });
    },
  );
});
