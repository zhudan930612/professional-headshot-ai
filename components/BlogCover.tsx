import { getBlogPresentation } from '@/lib/blogPresentation';

export const BlogCover = ({ slug, priority = false }: { slug: string; priority?: boolean }) => {
  const { cover, coverAlt } = getBlogPresentation(slug);
  return <img src={cover} alt={coverAlt} width={896} height={1200}
    loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async"
    className="journal-photo" />;
};
