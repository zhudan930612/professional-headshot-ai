import { BLOG_POSTS } from '@/constants';

export interface BlogPresentation {
  displayTitle: string;
  summary: string;
  cover: string;
  coverAlt: string;
  related: [string, string];
  action: { href: string; label: string };
}

const slugs = {
  outfit: 'what-to-wear-for-a-professional-headshot',
  mistakes: 'top-5-mistakes-in-resume-photos',
  light: 'lighting-101-studio-vs-natural',
  effective: 'what-makes-professional-headshot-effective-2025',
  comparison: 'ai-professional-headshots-vs-studio-photography',
  upload: 'how-to-upload-photos-best-ai-headshot-results',
  industry: 'professional-headshots-by-industry-tech-finance-creative',
  platforms: 'linkedin-resume-website-headshot-optimization-guide',
} as const;

const generator = { href: '/', label: 'Create your headshot' };
const relationships: Record<string, Pick<BlogPresentation, 'related' | 'action'>> = {
  [slugs.outfit]: { related: [slugs.industry, slugs.upload], action: generator },
  [slugs.mistakes]: { related: [slugs.effective, slugs.platforms], action: { href: '/linkedin-headshots', label: 'Explore LinkedIn headshots' } },
  [slugs.light]: { related: [slugs.upload, slugs.comparison], action: generator },
  [slugs.effective]: { related: [slugs.industry, slugs.platforms], action: generator },
  [slugs.comparison]: { related: [slugs.effective, slugs.upload], action: { href: '/pricing', label: 'Compare headshot plans' } },
  [slugs.upload]: { related: [slugs.light, slugs.outfit], action: generator },
  [slugs.industry]: { related: [slugs.outfit, slugs.platforms], action: generator },
  [slugs.platforms]: { related: [slugs.mistakes, slugs.effective], action: { href: '/linkedin-headshots', label: 'Create a LinkedIn headshot' } },
};

const editorial: Record<string, [string, string, string, string]> = {
  [slugs.outfit]: ['What to wear', 'Clothing, color and fit for a professional portrait.', '01', 'AI portrait example with a checked blazer in natural indoor light'],
  [slugs.mistakes]: ['Résumé photo mistakes', 'A practical look at framing, backgrounds and everyday photo choices.', '12', 'AI portrait example in a dark blazer against a city background'],
  [slugs.light]: ['Choosing your light', 'How window light and studio lighting shape a portrait.', '03', 'AI portrait example photographed in warm outdoor light'],
  [slugs.effective]: ['A headshot that works', 'Expression, framing and the details that make a portrait feel like you.', '08', 'AI portrait example in a grey blazer with soft indoor light'],
  [slugs.comparison]: ['AI or a photographer?', 'Consider the process, flexibility and trade-offs of each approach.', '17', 'AI portrait example with a dark jacket and a quiet architectural background'],
  [slugs.upload]: ['Choosing your photos', 'Prepare your reference photos before starting a generation.', '01', 'AI portrait example showing a clear face and natural expression'],
  [slugs.industry]: ['Headshots by profession', 'Match clothing and setting to the work you do.', '04', 'AI corporate portrait example in a navy suit near office windows'],
  [slugs.platforms]: ['One photo, different formats', 'Think through the crop for a profile, résumé or personal website.', '12', 'AI portrait example with room around the face and shoulders'],
};

export const BLOG_PRESENTATION: Record<string, BlogPresentation> = Object.fromEntries(
  Object.entries(editorial).map(([slug, [displayTitle, summary, image, coverAlt]]) => [
    slug, { ...relationships[slug], displayTitle, summary, cover: `/best-headshot/best_${image}.jpeg`, coverAlt },
  ]),
);

export function getBlogPresentation(slug: string): BlogPresentation {
  const value = BLOG_PRESENTATION[slug];
  if (!value) throw new Error(`Missing blog presentation: ${slug}`);
  return value;
}

export function getRelatedPosts(slug: string) {
  return getBlogPresentation(slug).related.map(relatedSlug => {
    const post = BLOG_POSTS.find(item => item.slug === relatedSlug);
    if (!post || relatedSlug === slug) throw new Error(`Invalid related article: ${slug} -> ${relatedSlug}`);
    return post;
  });
}
