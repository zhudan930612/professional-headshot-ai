import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BLOG_POSTS } from '../constants';
import { Layout } from '../components/Layout';
import { usePublicPageData } from '@/contexts/PublicPageContext';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import type { BlogPost as BlogPostType } from '../types';
import { parseMarkdownFile } from '../utils/markdownParser';
import { NotFound } from '@/pages/NotFound';

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
      setState({ slug, post: fallbackPost, loading: false });
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

  return (
    <Layout seo={{
      title: `${post.title} – Professional Headshot AI Blog`,
      description: post.excerpt || post.title,
      canonicalPath: `/blog/${slug}`,
    }}>
      <style>{`
        /* 博客内容自定义排版样式 */
        .blog-content h2 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          line-height: 1.3;
          letter-spacing: -0.025em;
        }

        .blog-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 2rem;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .blog-content h4 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #334155;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }

        .blog-content p {
          font-size: 1rem;
          line-height: 1.75;
          color: #475569;
          margin-bottom: 1.25rem;
        }

        .blog-content ul,
        .blog-content ol {
          margin-left: 1.5rem;
          margin-bottom: 1.25rem;
          margin-top: 0.5rem;
        }

        .blog-content ul li,
        .blog-content ol li {
          margin-bottom: 0.75rem;
          line-height: 1.75;
          color: #475569;
        }

        .blog-content ul li {
          list-style-type: disc;
        }

        .blog-content ol li {
          list-style-type: decimal;
        }

        .blog-content strong {
          font-weight: 700;
          color: #0f172a;
        }

        .blog-content em {
          font-style: italic;
          color: #64748b;
        }

        .blog-content blockquote {
          border-left: 4px solid #3b82f6;
          background-color: #f8fafc;
          padding: 1rem 1.5rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #475569;
        }

        .blog-content hr {
          margin: 2.5rem 0;
          border: none;
          border-top: 2px solid #e2e8f0;
        }

        .blog-content code {
          background-color: #f1f5f9;
          color: #e11d48;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .blog-content pre {
          background-color: #1e293b;
          color: #f1f5f9;
          padding: 1.5rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1.5rem 0;
          font-size: 0.875rem;
          line-height: 1.7;
        }

        .blog-content pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
          border-radius: 0;
        }

        .blog-content a {
          color: #3b82f6;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .blog-content a:hover {
          color: #2563eb;
        }

        .blog-content ul ul,
        .blog-content ol ol,
        .blog-content ul ol,
        .blog-content ol ul {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
      `}</style>
      <div className="bg-white min-h-screen pb-20">
        {/* Header Image */}
        <div className="h-64 md:h-96 w-full relative">
          <img
            src={`https://picsum.photos/seed/${post.id}/1200/600`}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>

        <div className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
          <Link to="/blog" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors font-medium text-sm">
            <ArrowLeft size={16} /> Back to Blog
          </Link>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 md:p-12">
            {/* Meta */}
            <div className="flex items-center gap-6 text-sm text-slate-500 mb-6 border-b border-slate-100 pb-6">
              <span className="flex items-center gap-2">
                <Calendar size={16} /> {post.date}
              </span>
              <span className="flex items-center gap-2">
                <Clock size={16} /> {post.readTime}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 leading-tight">
              {post.title}
            </h1>

            {/* HTML Content */}
            {post.content ? (
              <div
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500">Article content is being prepared...</p>
              </div>
            )}

            {/* CTA */}
            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end">
              <Link to={post.slug === 'linkedin-resume-website-headshot-optimization-guide' ? '/linkedin-headshots' : '/'} className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors">
                {post.slug === 'linkedin-resume-website-headshot-optimization-guide' ? 'Create a LinkedIn headshot' : 'Create Your Headshot Now'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
