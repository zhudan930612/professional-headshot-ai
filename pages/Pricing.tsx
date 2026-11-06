import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicPlans } from '@/hooks/usePublicPlans';
import { presentPlan } from '@/lib/planPresentation';
import { createCreemPayment } from '@/services/paymentService';
import type { SubscriptionPlan } from '@/types';
import './marketing.css';
import './pricing.css';

export const Pricing = () => {
  const { user, openAuthModal } = useAuth();
  const { plans, loading, unavailable } = usePublicPlans();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<SubscriptionPlan | null>(null);
  const checkoutPending = useRef(false);
  const descriptions = { free: 'Try your own photo', professional: 'Explore your professional look', executive: 'More looks, larger images' };
  const buy = async (id: SubscriptionPlan) => {
    if (!user) { openAuthModal('/pricing'); return; }
    if (checkoutPending.current || unavailable || loading) return;
    checkoutPending.current = true;
    setProcessing(id);
    setError('');
    try {
      const { paymentUrl } = await createCreemPayment(id);
      window.location.href = paymentUrl;
    } catch {
      setError('Checkout could not be opened. Please try again.');
      checkoutPending.current = false;
      setProcessing(null);
    }
  };
  return <Layout editorial>
    <div className="marketing pricing-page marketing-wrap">
      <header className="pricing-heading">
        <h1>Headshot pricing</h1>
        <p>Start free. Buy more credits when you need them.</p>
      </header>
      {error && <p role="alert" className="marketing-error">{error}</p>}
      {unavailable && <p role="alert" className="marketing-error">We could not confirm current prices. Please reload this page before purchasing.</p>}
      {loading && !plans.length && <p role="status">Loading packages…</p>}
      <div className="pricing-tiers">
        {plans.map(plan => {
          const details = presentPlan(plan);
          return <section key={plan.id} className={`pricing-tier pricing-tier-${plan.id} marketing-plan`} aria-label={`${details.name} package`}>
            <div className="pricing-tier-header">
              <div><h2>{details.name}</h2><p className="pricing-description">{descriptions[plan.id]}</p></div>
              <div className="pricing-tier-price"><p className="pricing-amount">${plan.price}</p><p className="pricing-payment">{plan.price === 0 ? 'No credit card' : 'USD · one-time'}</p></div>
            </div>
            <div className="pricing-allowance" data-plan-credits={plan.id}>
              <p><strong>{details.credits}</strong> generation credits</p>
              {plan.bonus_quota > 0 && <p className="pricing-bonus">{plan.quota} + {plan.bonus_quota} bonus included</p>}
            </div>
            <ul className="pricing-entitlements">
              <li><strong>{plan.quality}</strong> · {details.resolution} px</li>
              <li>{details.watermark}</li>
            </ul>
            {plan.price === 0
              ? <Link className="marketing-button pricing-action" aria-label="Try for free" to="/#upload-tool">Try for free</Link>
              : <button className="marketing-button pricing-action" aria-label={processing === plan.id ? 'Opening checkout…' : `Buy ${details.name}`} aria-busy={processing === plan.id} disabled={Boolean(processing) || loading || unavailable} onClick={() => void buy(plan.id)}>
                {processing === plan.id ? 'Opening checkout…' : `Buy ${details.name}`}
              </button>}
          </section>;
        })}
      </div>
      {plans.length > 0 && <div className="pricing-shared">
        <p>No subscription. Credits never expire.</p>
        <p>Every plan includes the template library and one free retry per original image, using the same template.</p>
      </div>}
      <section className="pricing-questions">
        <div><h2>Before you buy</h2><Link className="marketing-link" to="/faq">All questions & answers</Link></div>
        <div className="pricing-answers">
          <details><summary>How do I use my credits?<span className="pricing-disclosure-icon" aria-hidden="true" /></summary><p>Each template you generate uses one credit to create one image. Spend your credits across different sessions. The free allowance is granted once, not every month. Sign in with Google to get started.</p></details>
          <details><summary>What if a generation fails?<span className="pricing-disclosure-icon" aria-hidden="true" /></summary><p>A confirmed failure returns its credit. If a result is still being checked, use the recovery option rather than starting another generation. Results vary with your reference photo and selected template.</p></details>
          <details><summary>What happens to my existing credits?<span className="pricing-disclosure-icon" aria-hidden="true" /></summary><p>A purchase adds credits to your remaining balance. Higher resolution applies to new generations; it does not upscale images you already generated.</p></details>
          <details><summary>How do payment and refunds work?<span className="pricing-disclosure-icon" aria-hidden="true" /></summary><p>Review the final total at checkout. For payment help or a refund request, <a href="mailto:support@professionalheadshotai.ink">contact support</a> with your order details for review.</p></details>
        </div>
      </section>
    </div>
  </Layout>;
};
