import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ArrowLeft, Compass } from 'lucide-react';
import { NOT_FOUND_SEO } from '@/lib/seo';

export const NotFound: React.FC = () => {
  return (
    <Layout seo={NOT_FOUND_SEO}>
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 text-primary-600 mb-6">
          <Compass size={32} />
        </div>
        <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">404</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-4 text-base text-slate-600 leading-relaxed">
          We couldn&apos;t find the page you&apos;re looking for. It may have been moved, or the link you followed is out of date.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Browse headshot guides
          </Link>
        </div>
      </div>
    </Layout>
  );
};
