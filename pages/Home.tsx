import React, { useState } from 'react';
import { HeroTool } from '../components/HeroTool';
import { FAQ_ITEMS, USE_CASE_OPTIONS } from '../constants';
import { CheckCircle, Upload, Sliders, Download, ArrowRight, Shield, Clock, DollarSign, X, MoveRight, Sparkles, LayoutTemplate } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Data structure for comparison (Simulated data)
interface ComparisonPair {
  original: string;
  generated: string;
}

// Generate static sets of comparison images
const ROW_1_DATA: ComparisonPair[] = Array.from({ length: 10 }).map((_, i) => ({
  original: `https://picsum.photos/seed/casual_${i}/500/500`,
  generated: `https://picsum.photos/seed/professional_${i}/500/500`
}));

const ROW_2_DATA: ComparisonPair[] = Array.from({ length: 10 }).map((_, i) => ({
  original: `https://picsum.photos/seed/selfie_b_${i}/500/500`,
  generated: `https://picsum.photos/seed/headshot_b_${i}/500/500`
}));

export const Home = () => {
  const [selectedComparison, setSelectedComparison] = useState<ComparisonPair | null>(null);
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
                <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500" /> 5 Free Uses Daily</span>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold uppercase tracking-wide mb-4">
              <Sparkles size={14} /> Before & After
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">See Real AI Professional Headshots</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
                Click on any image below to see the transformation from a casual selfie to a professional headshot.
            </p>
        </div>

        <div className="relative">
             {/* Gradient Masks */}
            <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

            {/* Row 1 - Left Scroll */}
            <div className="flex mb-6 overflow-hidden">
                <div className="flex animate-marquee gap-4 md:gap-6 min-w-max hover:[animation-play-state:paused]">
                    {[...ROW_1_DATA, ...ROW_1_DATA].map((pair, i) => (
                        <div
                          key={`row1-${i}`}
                          onClick={() => setSelectedComparison(pair)}
                          className="w-48 md:w-64 aspect-[3/4] rounded-xl overflow-hidden shadow-md flex-shrink-0 cursor-pointer group relative"
                        >
                            <img src={pair.generated} alt="Professional headshot" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                               <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold text-slate-900 shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                                 View Comparison
                               </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Row 2 - Right Scroll */}
            <div className="flex overflow-hidden">
                <div className="flex animate-marquee-reverse gap-4 md:gap-6 min-w-max hover:[animation-play-state:paused]">
                    {[...ROW_2_DATA, ...ROW_2_DATA].map((pair, i) => (
                        <div
                          key={`row2-${i}`}
                          onClick={() => setSelectedComparison(pair)}
                          className="w-48 md:w-64 aspect-[3/4] rounded-xl overflow-hidden shadow-md flex-shrink-0 cursor-pointer group relative"
                        >
                            <img src={pair.generated} alt="Professional headshot" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                               <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold text-slate-900 shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                                 View Comparison
                               </div>
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

      {/* Comparison Modal */}
      {selectedComparison && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedComparison(null)}></div>
          <div className="bg-white rounded-2xl w-full max-w-4xl p-2 md:p-6 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setSelectedComparison(null)}
              className="absolute top-4 right-4 z-20 bg-white/80 hover:bg-white p-2 rounded-full shadow-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6 pt-4 md:pt-0">
               <h3 className="text-2xl font-bold text-slate-900">Transformation Result</h3>
               <p className="text-slate-500">From casual selfie to professional studio quality.</p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 pb-4">
               {/* Original */}
               <div className="flex flex-col items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full aspect-[3/4] md:w-80 rounded-xl overflow-hidden shadow-lg ring-4 ring-slate-100">
                     <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                        Original Selfie
                     </div>
                     <img src={selectedComparison.original} alt="Original selfie" className="w-full h-full object-cover" />
                  </div>
               </div>

               {/* Arrow Icon */}
               <div className="flex items-center justify-center text-primary-300 md:text-slate-300 rotate-90 md:rotate-0">
                  <MoveRight size={48} strokeWidth={1.5} />
               </div>

               {/* Generated */}
               <div className="flex flex-col items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full aspect-[3/4] md:w-80 rounded-xl overflow-hidden shadow-lg ring-4 ring-primary-100 shadow-primary-900/10">
                     <div className="absolute top-3 left-3 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-semibold z-10 flex items-center gap-1 shadow-sm">
                        <Sparkles size={10} className="fill-white" /> AI Professional
                     </div>
                     <img src={selectedComparison.generated} alt="Generated AI Headshot" className="w-full h-full object-cover" />
                  </div>
               </div>
            </div>

            <div className="mt-4 text-center">
               <button
                onClick={() => {
                  setSelectedComparison(null);
                  const element = document.getElementById('upload-tool');
                  if (element) {
                    const offsetTop = element.getBoundingClientRect().top + window.scrollY - 100;
                    window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-primary-500/20"
               >
                 Create Mine Now <ArrowRight size={18} />
               </button>
            </div>
          </div>
        </div>
      )}

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
                    <button
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
                    </button>
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
                            { icon: DollarSign, title: "Save Money", desc: "Professional shoots cost $200+. Get 5 free generations daily." },
                            { icon: Shield, title: "Private & Secure", desc: "We process your photos securely and delete them afterwards." }
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
  );
};