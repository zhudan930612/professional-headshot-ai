import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { HeroTool } from '@/components/HeroTool';
import { useAuth } from '@/contexts/AuthContext';
import { portraitImageProps } from '@/lib/responsiveImages';

const EXAMPLES = [
  { src: '/best-headshot/best_01.jpeg', label: 'Warm indoor', alt: 'AI-generated headshot with a checked blazer and softly lit indoor background' },
  { src: '/best-headshot/best_12.jpeg', label: 'Business casual', alt: 'AI-generated headshot with a dark blazer and an outdoor city background' },
  { src: '/best-headshot/best_03.jpeg', label: 'Natural light', alt: 'AI-generated headshot with a neutral coat and a green outdoor background' },
];

export const LinkedInHeadshots = () => {
  const [exampleIndex, setExampleIndex] = useState(0);
  const example = EXAMPLES[exampleIndex];
  const { user, openAuthModal } = useAuth();
  const { hash } = useLocation();

  useEffect(() => {
    if (hash === '#linkedin-generator') document.getElementById('linkedin-generator')?.scrollIntoView();
  }, [hash]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="pt-7 text-sm text-slate-500">
          <Link to="/" className="hover:text-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">Home</Link>
          <span aria-hidden="true" className="mx-3">/</span>
          <span aria-current="page">LinkedIn headshots</span>
        </nav>

        <section className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center pt-10 pb-16 lg:pt-14 lg:pb-20">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.08] max-w-xl">
              AI headshots for your LinkedIn profile.
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-lg">
              Turn your selfies into a professional profile photo. Explore a look that fits your work, then choose a result that still feels like you.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-5">
              <a href="#linkedin-generator"
                onClick={() => { if (!user) openAuthModal('/linkedin-headshots#linkedin-generator'); }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-600">
                Create my LinkedIn headshot <ArrowRight size={18} aria-hidden="true" />
              </a>
              <Link to="/pricing" className="text-primary-700 font-semibold underline underline-offset-4 text-center sm:text-left">View plans</Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">Upload. Choose a style. Review and download.</p>
          </div>

          <figure className="w-full max-w-md mx-auto lg:ml-auto">
            <div className="relative pl-6 pr-14 sm:pl-8 sm:pr-16">
              <img {...portraitImageProps(example.src, '(max-width: 600px) calc(100vw - 112px), 352px')} alt={example.alt} width={896} height={1200} fetchPriority="high" decoding="async"
                className="w-full aspect-[3/4] object-cover rounded-2xl bg-slate-100" />
              <div className="absolute right-0 bottom-6 sm:bottom-8 bg-white p-2 rounded-full shadow-lg">
                <img {...portraitImageProps(example.src, '(max-width: 639px) 112px, 144px')} alt="Circular crop preview of the selected example" width={144} height={144} decoding="async"
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover object-[center_30%] border border-slate-200" />
              </div>
            </div>
            <div role="group" aria-label="Choose a style example" className="mt-6 flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((item, index) => (
                <button key={item.src} type="button" aria-pressed={exampleIndex === index}
                  onClick={() => setExampleIndex(index)}
                  className={`px-3 py-2 rounded-full text-sm border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${exampleIndex === index ? 'bg-primary-50 border-primary-600 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <figcaption className="mt-3 text-center text-xs text-slate-500">AI-generated examples. Your results will vary.</figcaption>
          </figure>
        </section>

        <section aria-labelledby="profile-details" className="border-t border-slate-200 py-14 lg:py-20">
          <h2 id="profile-details" className="text-3xl font-bold tracking-tight text-slate-900 mb-10">Make it work at profile size.</h2>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-14">
            {[
              ['Keep your face recognizable', 'Compare your eyes, hair, glasses and facial features with your original photo. Choose a natural expression you would use when meeting a colleague.'],
              ['Leave room for a circular crop', 'Keep your face near the center with space around your hair and shoulders. Check the small preview before choosing your final profile photo.'],
              ['Let the background stay quiet', 'Try a simple indoor or outdoor setting. Pick clothing that fits how you work, and a background that keeps the attention on your face.'],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 className="font-semibold text-lg text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="photo-preparation" className="grid md:grid-cols-2 gap-8 lg:gap-20 bg-slate-50 rounded-2xl p-6 sm:p-10 mb-16">
          <div>
            <h2 id="photo-preparation" className="text-3xl font-bold tracking-tight text-slate-900">Start with a clear selfie.</h2>
            <p className="mt-4 text-slate-600 leading-relaxed">Use recent photos of yourself. Clear inputs make it easier to compare the generated result with how you actually look.</p>
            <Link to="/blog/how-to-upload-photos-best-ai-headshot-results" className="inline-block mt-5 font-semibold text-primary-700 underline underline-offset-4">Read the photo upload guide</Link>
          </div>
          <ul className="space-y-4 self-center">
            {['Face the camera in even, natural light.', 'Keep your face visible; avoid sunglasses and heavy filters.', 'Use individual photos rather than group shots.', 'Review the result before adding it to your profile.'].map(tip => (
              <li key={tip} className="flex gap-3 text-slate-700"><Check size={20} className="shrink-0 mt-0.5 text-primary-600" aria-hidden="true" /><span>{tip}</span></li>
            ))}
          </ul>
        </section>

        <section id="linkedin-generator" aria-labelledby="linkedin-generator-title" className="scroll-mt-24 pb-16">
          <div className="mb-8">
            <h2 id="linkedin-generator-title" className="text-3xl font-bold tracking-tight text-slate-900">Create your LinkedIn headshot</h2>
            <p className="mt-3 text-slate-600">Upload your photos, select a style, and review your generated headshot before downloading it.</p>
          </div>
          <HeroTool />
        </section>

        <section aria-labelledby="linkedin-questions" className="max-w-3xl mx-auto pt-4 pb-16 lg:pb-24">
          <h2 id="linkedin-questions" className="text-3xl font-bold text-slate-900 mb-6">Before you update your profile</h2>
          {[
            ['Will the result look exactly like me?', 'AI results can vary. Check your facial features and expression against your original photo, and only choose an image you feel represents you accurately.'],
            ['Does this tool change my LinkedIn profile?', 'No. Download your chosen headshot and update your LinkedIn profile yourself. This tool does not connect to or publish to your LinkedIn account.'],
            ['Is the circular preview an export option?', 'The circle above is an example to help you judge framing. The generator downloads a portrait image; adjust the crop when adding it to your profile.'],
          ].map(([question, answer]) => (
            <details key={question} className="border-b border-slate-200 py-5">
              <summary className="font-semibold text-slate-900 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">{question}</summary>
              <p className="pt-3 text-slate-600 leading-relaxed">{answer}</p>
            </details>
          ))}
          <Link to="/blog/linkedin-resume-website-headshot-optimization-guide" className="inline-block mt-7 text-primary-700 font-semibold underline underline-offset-4">Explore the LinkedIn, résumé and website photo guide</Link>
        </section>
      </div>
    </Layout>
  );
};
