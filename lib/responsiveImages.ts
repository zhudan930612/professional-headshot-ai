export const PORTRAIT_WIDTHS = [192, 384, 640, 768] as const;

export function portraitImageProps(source: string, sizes: string) {
  const match = /^\/best-headshot\/(best_\d{2})\.jpeg$/.exec(source);
  if (!match) return { src: source };
  const base = `/optimized/portraits/${match[1]}`;
  return {
    src: `${base}-640.webp`,
    srcSet: [...PORTRAIT_WIDTHS.map(width => `${base}-${width}.webp ${width}w`), `${source} 896w`].join(', '),
    sizes,
  };
}
