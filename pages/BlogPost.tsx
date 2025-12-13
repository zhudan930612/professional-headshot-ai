import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BLOG_POSTS } from '../constants';
import { ArrowLeft, Clock, Calendar, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = BLOG_POSTS.find(p => p.slug === slug);
  const [content, setContent] = useState('');

  // Scroll to top on mount and load content
  useEffect(() => {
    window.scrollTo(0, 0);

    if (post) {
      // Dynamically load markdown content
      fetch(`/blog/${post.slug}.md`)
        .then(res => res.text())
        .then(text => setContent(text))
        .catch(err => {
          console.error('Failed to load blog content:', err);
          setContent('');
        });
    }
  }, [post?.slug]);

  if (!post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Article not found</h2>
        <button 
          onClick={() => navigate('/blog')}
          className="text-primary-600 hover:underline flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Blog
        </button>
      </div>
    );
  }

  return (
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
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

            {/* Markdown Content */}
            <div className="prose prose-slate prose-lg max-w-none">
                {content ? (
                    <ReactMarkdown
                        components={{
                            h1: ({ node, ...props }) => <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 mt-8" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-slate-900 mb-4 mt-6" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-5" {...props} />,
                            p: ({ node, ...props }) => <p className="text-slate-700 mb-4 leading-relaxed" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-6 space-y-2 mb-6 text-slate-700" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 space-y-2 mb-6 text-slate-700" {...props} />,
                            li: ({ node, ...props }) => <li className="text-slate-700" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                            em: ({ node, ...props }) => <em className="italic text-slate-700" {...props} />,
                            blockquote: ({ node, ...props }) => (
                                <blockquote className="bg-slate-50 border-l-4 border-primary-500 p-6 my-6 rounded-r-lg italic text-slate-700" {...props} />
                            ),
                            code: ({ node, inline, ...props }) =>
                                inline ? (
                                    <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono text-slate-900" {...props} />
                                ) : (
                                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4"><code {...props} /></pre>
                                ),
                            a: ({ node, ...props }) => <a className="text-primary-600 hover:underline font-medium" {...props} />,
                            hr: ({ node, ...props }) => <hr className="my-8 border-slate-200" {...props} />,
                            table: ({ node, ...props }) => <table className="w-full border-collapse my-6" {...props} />,
                            th: ({ node, ...props }) => <th className="border border-slate-300 px-4 py-2 bg-slate-50 font-semibold" {...props} />,
                            td: ({ node, ...props }) => <td className="border border-slate-300 px-4 py-2" {...props} />,
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-slate-500">Loading article content...</p>
                    </div>
                )}
            </div>

            {/* Share / CTA */}
            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-slate-900">Share this article:</span>
                    <button className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                        <Share2 size={18} />
                    </button>
                </div>
                <Link to="/" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors">
                    Create Your Headshot Now
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
};