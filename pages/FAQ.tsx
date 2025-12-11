import React from 'react';
import { FAQ_ITEMS } from '../constants';
import { Mail, HelpCircle } from 'lucide-react';

export const FAQ = () => {
  return (
    <div className="bg-white py-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-primary-100 text-primary-600 rounded-full mb-4">
                <HelpCircle size={32} />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Help & Frequently Asked Questions</h1>
            <p className="text-lg text-slate-600">
                Everything you need to know about generating professional headshots with AI.
            </p>
        </div>
        
        <div className="space-y-8">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="border-b border-slate-100 pb-8 last:border-0">
              <h3 className="text-xl font-bold text-slate-900 mb-3">{item.question}</h3>
              <p className="text-slate-600 leading-relaxed text-base">{item.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-slate-50 rounded-2xl p-8 text-center border border-slate-100">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm text-primary-600 mb-4 ring-1 ring-slate-200">
                <Mail size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Still have questions?</h3>
            <p className="text-slate-600 mb-6 max-w-lg mx-auto">
                Can't find the answer you're looking for? Our support team is here to help you get the perfect headshot.
            </p>
            <a 
                href="mailto:support@professionalheadshot.ai" 
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md"
            >
                Contact Support
            </a>
        </div>
      </div>
    </div>
  );
};