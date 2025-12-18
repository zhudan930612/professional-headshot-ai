import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BLOG_POSTS } from '../constants';
import { Layout } from '../components/Layout';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import type { BlogPost as BlogPostType } from '../types';
import { parseMarkdownFile } from '../utils/markdownParser';
import hljs from 'highlight.js';

export const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);

  // Load post content (Markdown or HTML from constants)
  useEffect(() => {
    const loadPost = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Load blogs from Markdown files
      const markdownBlogs = [
        'what-to-wear-for-a-professional-headshot',
        'top-5-mistakes-in-resume-photos',
        'lighting-101-studio-vs-natural',
        'what-makes-professional-headshot-effective-2025',
        'ai-professional-headshots-vs-studio-photography',
        'how-to-upload-photos-best-ai-headshot-results',
        'professional-headshots-by-industry-tech-finance-creative',
        'linkedin-resume-website-headshot-optimization-guide'
      ];

      if (markdownBlogs.includes(slug)) {
        try {
          console.log('[BlogPost] Loading from Markdown...');
          const { metadata, html } = await parseMarkdownFile(`/content/blog/${slug}.md`);
          setPost({
            ...metadata,
            content: html,
          });
          console.log('[BlogPost] ✅ Markdown loaded successfully');
        } catch (error) {
          console.error('[BlogPost] ❌ Failed to load markdown, falling back to constants.ts:', error);
          // Fallback: Use HTML from constants.ts
          const fallbackPost = BLOG_POSTS.find(p => p.slug === slug);
          setPost(fallbackPost || null);
        }
      } else {
        // Other blogs: Use HTML from constants.ts
        console.log('[BlogPost] Loading from constants.ts...');
        const htmlPost = BLOG_POSTS.find(p => p.slug === slug);
        setPost(htmlPost || null);
      }

      setLoading(false);
    };

    loadPost();
    window.scrollTo(0, 0);
  }, [slug]);

  // Highlight code blocks after content is rendered
  useEffect(() => {
    if (post && post.content) {
      // Wait for DOM to update
      setTimeout(() => {
        hljs.highlightAll();
        console.log('[BlogPost] ✨ Code highlighting applied');
      }, 100);
    }
  }, [post]);

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

  if (!post) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Article not found</h2>
          <button
            onClick={() => navigate('/blog')}
            className="text-primary-600 hover:underline flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Blog
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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
                <Link to="/" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors">
                    Create Your Headshot Now
                </Link>
            </div>
        </div>
      </div>
      </div>
    </Layout>
  );
};