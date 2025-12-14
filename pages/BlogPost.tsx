import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BLOG_POSTS } from '../constants';
import { Layout } from '../components/Layout';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import type { BlogPost as BlogPostType } from '../types';

export const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = BLOG_POSTS.find(p => p.slug === slug);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [post?.slug]);

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

            {/* HTML Content */}
            {post.content ? (
                <div
                    className="prose prose-slate max-w-none
                        prose-h2:text-2xl prose-h2:font-bold prose-h2:text-slate-900 prose-h2:mt-8 prose-h2:mb-4
                        prose-h3:text-xl prose-h3:font-semibold prose-h3:text-slate-900 prose-h3:mt-6 prose-h3:mb-3
                        prose-h4:text-lg prose-h4:font-semibold prose-h4:text-slate-900 prose-h4:mt-4 prose-h4:mb-2
                        prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-4
                        prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4 prose-ul:text-slate-700
                        prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4 prose-ol:text-slate-700
                        prose-li:mb-2 prose-li:text-slate-700
                        prose-strong:font-bold prose-strong:text-slate-900
                        prose-em:italic prose-em:text-slate-700
                        prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:bg-slate-50 prose-blockquote:p-4 prose-blockquote:my-6
                        prose-code:bg-slate-100 prose-code:text-slate-900 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
                        prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:mb-4
                        prose-a:text-primary-600 prose-a:hover:underline
                        prose-hr:border-slate-200 prose-hr:my-8"
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