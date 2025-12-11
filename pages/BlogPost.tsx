import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BLOG_POSTS } from '../constants';
import { ArrowLeft, Clock, Calendar, Share2 } from 'lucide-react';

export const BlogPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const post = BLOG_POSTS.find(p => p.id === id);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

            {/* Placeholder Content */}
            <div className="prose prose-slate prose-lg max-w-none">
                <p className="lead text-xl text-slate-600 mb-8">
                    {post.excerpt} This is a placeholder introduction that sets the stage for the valuable insights contained in this article regarding professional headshots and personal branding.
                </p>

                <h3>Why This Matters</h3>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                </p>
                <p>
                    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
                </p>

                <div className="bg-slate-50 border-l-4 border-primary-500 p-6 my-8 rounded-r-lg italic text-slate-700">
                    "Your professional headshot is often the first impression you make. Make it count with high-quality lighting and attire."
                </div>

                <h3>Key Takeaways</h3>
                <ul className="list-disc pl-6 space-y-2 mb-8">
                    <li>First impressions happen in less than a second.</li>
                    <li>Lighting can drastically change the mood of a photo.</li>
                    <li>AI tools provide a cost-effective alternative to traditional studios.</li>
                    <li>Consistency across platforms builds brand recognition.</li>
                </ul>

                <h3>Conclusion</h3>
                <p>
                   To wrap up, ensuring your professional image is polished and up-to-date is crucial in today's digital landscape. Whether you choose a traditional photographer or use AI generation tools, the goal remains the same: presenting the best version of yourself to the world.
                </p>
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