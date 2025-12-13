import React from 'react';
import { BLOG_POSTS } from '../constants';
import { Link } from 'react-router-dom';

export const Blog = () => {
  return (
    <div className="bg-slate-50 py-16 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Headshot Guides & Tips</h1>
          <p className="text-xl text-slate-600">Master your professional image with our expert advice.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BLOG_POSTS.map((post) => (
            <Link to={`/blog/${post.slug}`} key={post.id} className="group block">
              <article className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all h-full flex flex-col">
                <div className="h-48 bg-slate-200 relative overflow-hidden">
                    <img 
                      src={`https://picsum.photos/seed/${post.id}/800/400`} 
                      alt="Blog cover" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>{post.date}</span>
                      <span>{post.readTime}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3 leading-tight group-hover:text-primary-600 transition-colors">{post.title}</h2>
                  <p className="text-slate-600 mb-4 line-clamp-3 flex-grow">{post.excerpt}</p>
                  <span className="text-primary-600 font-semibold text-sm group-hover:underline mt-auto inline-block">Read Article →</span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};