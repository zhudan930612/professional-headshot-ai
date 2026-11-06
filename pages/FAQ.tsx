import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { FAQ_ITEMS } from '@/constants';
import './marketing.css';

export const FAQ = () => <Layout editorial>
  <div className="marketing marketing-wrap marketing-help">
    <header className="marketing-page-heading"><h1>Headshot questions</h1><p className="marketing-lead">Photos, generation credits, downloads and privacy. Here is how the service works.</p></header>
    <div className="marketing-help-layout">
      <aside><h2>Need a hand?</h2><p>For help with a generation or payment, include your account email and order details when relevant.</p><a className="marketing-link" href="mailto:support@professionalheadshotai.ink">Contact support</a></aside>
      <div className="marketing-faq-list">
        {FAQ_ITEMS.map((item, index) => <details key={item.question} open={index === 0}>
          <summary>{item.question}</summary><p>{item.answer}</p>
          {item.href && <Link className="marketing-link" to={item.href}>{item.linkLabel}</Link>}
        </details>)}
      </div>
    </div>
  </div>
</Layout>;
