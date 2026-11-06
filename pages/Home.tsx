import React from 'react';
import { HeroTool } from '../components/HeroTool';
import { Layout } from '../components/Layout';
import { FAQ_ITEMS, USE_CASE_OPTIONS } from '../constants';
import { CheckCircle, Upload, Download, ArrowRight, Shield, Clock, DollarSign, Sparkles, LayoutTemplate } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UseCase } from '@/types';
import { portraitImageProps } from '@/lib/responsiveImages';
import { serializeStructuredData, WEBSITE_STRUCTURED_DATA } from '@/lib/structuredData';

// Data structure for gallery images
const ROW_1_DATA: string[] = [
  '/best-headshot/best_01.jpeg',
  '/best-headshot/best_02.jpeg',
  '/best-headshot/best_03.jpeg',
  '/best-headshot/best_04.jpeg',
  '/best-headshot/best_05.jpeg',
  '/best-headshot/best_06.jpeg',
  '/best-headshot/best_07.jpeg',
  '/best-headshot/best_08.jpeg',
  '/best-headshot/best_09.jpeg',
  '/best-headshot/best_10.jpeg',
];

const ROW_2_DATA: string[] = [
  '/best-headshot/best_11.jpeg',
  '/best-headshot/best_12.jpeg',
  '/best-headshot/best_13.jpeg',
  '/best-headshot/best_14.jpeg',
  '/best-headshot/best_15.jpeg',
  '/best-headshot/best_16.jpeg',
  '/best-headshot/best_17.jpeg',
  '/best-headshot/best_18.jpeg',
  '/best-headshot/best_19.jpeg',
  '/best-headshot/best_20.jpeg',
];

export const Home = () => {
  const { user, openAuthModal } = useAuth();
  const location = useLocation();

  const handleCreateHeadshots = () => {
    // Always scroll to the tool
    const element = document.getElementById('upload-tool');
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }

    // If not logged in, show auth modal with return path
    if (!user) {
      openAuthModal(location.pathname);
    }
  };

  return (
    <Layout>
      <script id="website-structured-data" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(WEBSITE_STRUCTURED_DATA) }} />
      <div className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col gap-12 items-center mb-12 text-center">
            
            {/* Top Content - Text */}
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-primary-700 text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                </span>
                Free AI Headshot Generator
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
                Create Your <span className="text-primary-600">Professional Headshot</span> with AI
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                Transform your selfies into studio-quality professional headshots for LinkedIn, Resumes, and CVs. No photographer needed.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleCreateHeadshots}
                  className="px-6 py-3.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
                >
                  Create Headshots Free
                </button>
                <button
                  onClick={() => {
                    const element = document.getElementById('examples');
                    if (element) {
                      const offsetTop = element.getBoundingClientRect().top + window.scrollY - 100;
                      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                    }
                  }}
                  className="px-6 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  See Examples
                </button>
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500" /> Sign In for 5 Free Uses</span>
                <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500" /> No Credit Card Required</span>
              </div>
            </div>

            {/* Bottom Content - The Tool (Wide Container) */}
            <div id="upload-tool" className="w-full max-w-7xl mx-auto">
                <HeroTool />
            </div>
          </div>
        </div>
        
        {/* Background blobs */}
        <div className="absolute top-0 right-1/4 -mt-20 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 z-0"></div>
        <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-50 z-0"></div>
      </section>

      {/* Examples Scrolling Marquee */}
      <section id="examples" className="w-full overflow-hidden">
        <div className="text-center mb-12 px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold tracking-wide mb-4">
              <Sparkles size={14} /> Best Examples
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Get 3x More Interview Invitations</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
                Professional headshots that help you stand out to recruiters and land your dream job.
            </p>
        </div>

        <div className="relative">
             {/* Gradient Masks */}
            <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

            {/* Row 1 - Left Scroll */}
            <div className="flex mb-6 overflow-hidden">
                <div className="flex animate-marquee gap-4 md:gap-6 min-w-max hover:[animation-play-state:paused]">
                    {[...ROW_1_DATA, ...ROW_1_DATA].map((imageUrl, i) => (
                        <div
                          key={`row1-${i}`}
                          className="w-48 md:w-64 aspect-[3/4] rounded-xl overflow-hidden shadow-md flex-shrink-0 relative"
                        >
                            <img {...portraitImageProps(imageUrl, '(max-width: 767px) 192px, 256px')} width={896} height={1200} loading="lazy" decoding="async" alt="Professional headshot" className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-medium z-10 flex items-center gap-1">
                                <Sparkles size={8} className="fill-white" /> AI Generated
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Row 2 - Right Scroll */}
            <div className="flex overflow-hidden">
                <div className="flex animate-marquee-reverse gap-4 md:gap-6 min-w-max hover:[animation-play-state:paused]">
                    {[...ROW_2_DATA, ...ROW_2_DATA].map((imageUrl, i) => (
                        <div
                          key={`row2-${i}`}
                          className="w-48 md:w-64 aspect-[3/4] rounded-xl overflow-hidden shadow-md flex-shrink-0 relative"
                        >
                            <img {...portraitImageProps(imageUrl, '(max-width: 767px) 192px, 256px')} width={896} height={1200} loading="lazy" decoding="async" alt="Professional headshot" className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-medium z-10 flex items-center gap-1">
                                <Sparkles size={8} className="fill-white" /> AI Generated
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="text-center mt-12 px-4">
            <button
              onClick={() => {
                const element = document.getElementById('upload-tool');
                if (element) {
                  const offsetTop = element.getBoundingClientRect().top + window.scrollY - 100;
                  window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700"
            >
                Try it with your own photos <ArrowRight size={18} />
            </button>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">How It Works</h2>
                <p className="text-slate-600">Three simple steps to your new professional identity.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
                {[
                    { icon: Upload, title: "1. Upload Selfies", desc: "Upload 1-5 clear selfies from your phone. No professional equipment needed." },
                    { icon: LayoutTemplate, title: "2. Pick a Template", desc: "Browse our gallery and select the perfect professional look for your needs." },
                    { icon: Download, title: "3. Download", desc: "Our AI generates your photos in seconds. Review, select, and download high-res files." }
                ].map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 text-primary-600">
                            <step.icon size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                        <p className="text-slate-600 leading-relaxed">{step.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Professional Headshots for Every Career Moment</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {USE_CASE_OPTIONS.map((useCase) => (
                <div key={useCase.value} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-primary-200 hover:shadow-lg transition-all">
                    <div className="text-primary-600 mb-4">
                         <CheckCircle size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{useCase.label}</h3>
                    <p className="text-sm text-slate-500 mb-6">Perfect for updating your {useCase.label.toLowerCase()} to stand out to recruiters and clients.</p>
                    {useCase.value === UseCase.LinkedIn ? (
                      <Link to="/linkedin-headshots" className="text-sm font-semibold text-primary-600 inline-flex items-center gap-1 hover:underline">
                        Explore LinkedIn headshots <ArrowRight size={14} />
                      </Link>
                    ) : <button
                        onClick={() => {
                          const element = document.getElementById('upload-tool');
                          if (element) {
                            const offsetTop = element.getBoundingClientRect().top + window.scrollY - 100;
                            window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                          }
                        }}
                        className="text-sm font-semibold text-primary-600 flex items-center gap-1 hover:gap-2 transition-all"
                    >
                        Create for this <ArrowRight size={14} />
                    </button>}
                </div>
            ))}
        </div>
      </section>

      {/* Why Choose AI */}
      <section className="bg-slate-900 text-white py-20 rounded-3xl mx-4 lg:mx-8">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Why Choose an AI Professional Headshot?</h2>
                    <p className="text-slate-300 mb-8 text-lg">
                        Traditional photography is expensive and time-consuming. AI offers a smarter alternative without compromising on quality.
                    </p>
                    <div className="space-y-6">
                        {[
                            { icon: Clock, title: "Save Time", desc: "No booking photographers or traveling to studios. Done in minutes." },
                            { icon: DollarSign, title: "Save Money", desc: "Professional shoots cost $200+. Get 5 free lifetime generations." },
                            { icon: Shield, title: "Private & Secure", desc: "Your uploads and headshots are kept in private storage." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="flex-shrink-0 mt-1">
                                    <item.icon className="text-primary-400" size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">{item.title}</h4>
                                    <p className="text-slate-400 text-sm">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-sm border border-white/10">
                    <h3 className="font-bold text-xl mb-6">Traditional vs. AI Headshot</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <span className="text-slate-300">Cost</span>
                            <div className="text-right">
                                <span className="block text-red-400 line-through text-sm">$200+</span>
                                <span className="text-green-400 font-bold">Free</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <span className="text-slate-300">Time</span>
                            <div className="text-right">
                                <span className="block text-red-400 text-sm">3-5 Days</span>
                                <span className="text-green-400 font-bold">30 Seconds</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <span className="text-slate-300">Styles</span>
                            <div className="text-right">
                                <span className="block text-red-400 text-sm">1 Outfit</span>
                                <span className="text-green-400 font-bold">Unlimited</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
         </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-6">
            {FAQ_ITEMS.slice(0, 4).map((item, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h3 className="font-bold text-slate-900 mb-2">{item.question}</h3>
                    <p className="text-slate-600">{item.answer}</p>
                </div>
            ))}
            <div className="text-center mt-8">
                 <Link to="/faq" className="text-primary-600 font-semibold hover:underline">View all FAQs</Link>
            </div>
        </div>
      </section>
      </div>
    </Layout>
  );
};
