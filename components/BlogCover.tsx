import { getBlogPresentation } from '@/lib/blogPresentation';
import { portraitImageProps } from '@/lib/responsiveImages';

export const BlogCover = ({ slug, priority = false, sizes = '(max-width: 600px) calc(100vw - 40px), 36vw' }: { slug: string; priority?: boolean; sizes?: string }) => {
  const { cover, coverAlt } = getBlogPresentation(slug);
  return <img {...portraitImageProps(cover, sizes)} alt={coverAlt} width={896} height={1200}
    loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async"
    className="journal-photo" />;
};
