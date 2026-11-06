import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BLOG_POSTS } from '../constants';
import { Layout } from '../components/Layout';
import { usePublicPageData } from '@/contexts/PublicPageContext';
import { formatReadingHtml, getArticleSections } from '@/lib/blogReading';
import './blog.css';
import type { BlogPost as BlogPostType } from '../types';
import { parseMarkdownFile } from '../utils/markdownParser';
import { NotFound } from '@/pages/NotFound';
import { BlogCover } from '@/components/BlogCover';
import { getBlogPresentation, getRelatedPosts } from '@/lib/blogPresentation';

export const BlogPost = () => {
  const { slug } = useParams();
  const pageData = usePublicPageData();
  const initialPost = pageData?.post && pageData.post.slug === slug ? pageData.post : null;
  const [state, setState] = useState<{ slug?: string; post: BlogPostType | null; loading: boolean }>({
    slug, post: initialPost, loading: !initialPost,
  });
  const { post, loading } = state.slug === slug ? state : { post: null, loading: true };

  useEffect(() => {
    const controller = new AbortController();
    if (initialPost) {
      setState({ slug, post: initialPost, loading: false });
      return () => controller.abort();
    }
    const fallbackPost = BLOG_POSTS.find(item => item.slug === slug);
    if (!fallbackPost) {
      setState({ slug, post: null, loading: false });
      return () => controller.abort();
    }
    setState({ slug, post: null, loading: true });
    void parseMarkdownFile(`/content/blog/${slug}.md`, controller.signal).then(({ metadata, html }) => {
      if (!controller.signal.aborted) setState({ slug, post: { ...metadata, content: html }, loading: false });
    }).catch(error => {
      if (controller.signal.aborted) return;
      console.error('Could not load article; using the bundled copy.', error);
      setState({ slug, post: { ...fallbackPost, content: formatReadingHtml(fallbackPost.content) }, loading: false });
    });
    return () => controller.abort();
  }, [slug, initialPost]);

  if (!BLOG_POSTS.some(item => item.slug === slug)) return <NotFound />;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-slate-600">Loading article...</p>
        </div>
      </Layout>
    );
  }

  if (!post) return <NotFound />;
  const presentation = getBlogPresentation(post.slug);
  const relatedPosts = getRelatedPosts(post.slug);

  const sections = getArticleSections(post.content);
  return (
    <Layout editorial seo={{
      title: `${post.title} – Professional Headshot AI Blog`,
      description: post.excerpt || post.title,
      canonicalPath: `/blog/${slug}`,
    }}>
      <article className="journal">
        <header className="article-opening">
          <figure><BlogCover slug={post.slug} priority /></figure>
          <div className="article-heading">
            <h1>{presentation.displayTitle}</h1>
            <p>{presentation.summary}</p>
            <a href={`#${sections[0]?.id ?? 'article-body'}`} className="journal-action">Read guide</a>
            <div className="article-meta"><time>{post.date}</time><span>{post.readTime}</span><Link to="/blog">All guides</Link></div>
          </div>
        </header>
        <div className="article-layout">
          <aside className="article-aside">
            <h2>Contents</h2>
            <nav aria-label="Article contents">
              {sections.map((section, index) => <a key={section.id} href={`#${section.id}`} style={{ '--i': index } as React.CSSProperties}>{section.title}</a>)}
            </nav>
            <figure><BlogCover slug={post.slug} /></figure>
          </aside>
          <div>
            <div id="article-body" className="blog-content" dangerouslySetInnerHTML={{ __html: post.content }} />
            <div className="article-end"><Link to={presentation.action.href} className="journal-action">{presentation.action.label}</Link></div>
          </div>
        </div>
        <nav aria-label="Related articles" className="journal-related">
          <h2>Keep reading</h2>
          <div className="journal-related-list">
            {relatedPosts.map(related => <Link key={related.slug} to={`/blog/${related.slug}`}>
              <figure><BlogCover slug={related.slug} sizes="(max-width: 600px) 36vw, (max-width: 1440px) 18vw, 250px" /></figure>
              <h3>{getBlogPresentation(related.slug).displayTitle}</h3>
            </Link>)}
          </div>
        </nav>
        <p className="journal-credit">AI-generated portrait examples.</p>
      </article>
    </Layout>
  );
};
