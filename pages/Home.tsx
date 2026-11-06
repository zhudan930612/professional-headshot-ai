import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HeroTool } from '@/components/HeroTool';
import { Layout } from '@/components/Layout';
import { FAQ_ITEMS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicPlans } from '@/hooks/usePublicPlans';
import { presentPlan } from '@/lib/planPresentation';
import { portraitImageProps } from '@/lib/responsiveImages';
import { serializeStructuredData, WEBSITE_STRUCTURED_DATA } from '@/lib/structuredData';
import './marketing.css';

const EXAMPLES = [
  { image: 'best_01', label: 'Relaxed tailoring' },
  { image: 'best_12', label: 'Business casual' },
  { image: 'best_03', label: 'A polished profile' },
  { image: 'best_08', label: 'A different look' },
];

export const Home = () => {
  const { user, openAuthModal } = useAuth();
  const location = useLocation();
  const { plans } = usePublicPlans();
  const free = plans.find(plan => plan.id === 'free');
  useEffect(() => {
    if (location.hash === '#upload-tool') document.getElementById('upload-tool')?.scrollIntoView();
  }, [location.hash]);
  const start = () => {
    document.getElementById('upload-tool')?.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
    if (!user) openAuthModal(`${location.pathname}#upload-tool`);
  };
  return (
    <Layout editorial>
      <script id="website-structured-data" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(WEBSITE_STRUCTURED_DATA) }} />
      <div className="marketing">
        <section className="marketing-hero marketing-wrap">
          <div className="marketing-intro">
            <h1>AI headshots.<br />One selfie.</h1>
            <p className="marketing-lead">Choose a professional style for LinkedIn, your website or work profile. Try it with your own photo.</p>
            <button className="marketing-button" onClick={start}>
              {user ? 'Create headshots' : free ? `Try ${presentPlan(free).credits} free generations` : 'Try for free'}
            </button>
            <p className="marketing-note">Google sign-in · Watermarked free results · No credit card</p>
            <a className="marketing-link" href="#examples">Explore the styles</a>
          </div>
          <figure className="marketing-portrait">
            <img {...portraitImageProps('/best-headshot/best_01.jpeg', '(min-width: 1024px) 480px, (min-width: 700px) 45vw, 100vw')}
              width={896} height={1200} fetchPriority="high" alt="AI-generated portrait in a professional style" />
            <figcaption>AI-generated style example</figcaption>
          </figure>
        </section>
        <section id="upload-tool" className="marketing-tool marketing-wrap">
          <div className="marketing-section-heading">
            <h2>Make it your own</h2>
            <p>Select one clear photo of yourself, then choose the templates you want to try.</p>
          </div>
          <div data-ui><HeroTool /></div>
        </section>
        <section id="examples" className="marketing-examples marketing-wrap">
          <div className="marketing-section-heading">
            <h2>Find your work look</h2>
            <p>Explore AI-generated examples. Your result will depend on your photo and selected template.</p>
          </div>
          <div className="marketing-contact-sheet">
            {EXAMPLES.map(example => (
              <figure key={example.image}>
                <img {...portraitImageProps(`/best-headshot/${example.image}.jpeg`, '(min-width: 1024px) 300px, (min-width: 700px) 24vw, 46vw')}
                  width={896} height={1200} loading="lazy" decoding="async" alt={`AI-generated headshot example: ${example.label}`} />
                <figcaption>{example.label}</figcaption>
              </figure>
            ))}
          </div>
          <Link className="marketing-link" to="/linkedin-headshots">See how a headshot fits LinkedIn</Link>
        </section>
        <section className="marketing-process">
          <div className="marketing-wrap marketing-split">
            <div><h2>Your photo.<br />Your choice.</h2><p>Start with a clear view of your face. You can try another reference photo when you want a different result.</p></div>
            <ol>
              <li><h3>Choose your selfie</h3><p>Upload up to five photos and select one as your reference. Each generation uses that selected photo.</p></li>
              <li><h3>Pick your templates</h3><p>Choose the clothing, background and framing you like. Each selected template generates one image and uses one credit.</p></li>
              <li><h3>Review and download</h3><p>Check the likeness and details before using a result. Each completed credit-charged image includes one free retry with the same template.</p></li>
            </ol>
          </div>
        </section>
        <section className="marketing-wrap marketing-split marketing-packages">
          <div><h2>Pay once.<br />Create when you need.</h2><p>Start with free, watermarked generations. Buy more credits for watermark-free downloads. No subscription.</p><Link className="marketing-link" to="/pricing">Compare all package details</Link></div>
          <div className="marketing-package-list">
            {plans.filter(plan => plan.price > 0).map(plan => {
              const details = presentPlan(plan);
              return <Link to="/pricing" className="marketing-package-row" key={plan.id}>
                <div><h3>{details.name}</h3><p>{details.credits} generation credits · {details.resolution} px</p></div>
                <span>${plan.price}</span>
              </Link>;
            })}
            {!plans.length && <Link className="marketing-link" to="/pricing">View current packages</Link>}
          </div>
        </section>
        <section className="marketing-wrap marketing-split marketing-home-faq">
          <div><h2>Questions, answered</h2><Link className="marketing-link" to="/faq">Read all FAQs</Link></div>
          <div className="marketing-faq-list">
            {FAQ_ITEMS.slice(0, 4).map(item => <details key={item.question}>
              <summary>{item.question}</summary><p>{item.answer}</p>
              {item.href && <Link className="marketing-link" to={item.href}>{item.linkLabel}</Link>}
            </details>)}
          </div>
        </section>
      </div>
    </Layout>
  );
};
