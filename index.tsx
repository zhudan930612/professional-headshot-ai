import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import type { PublicPageData } from '@/types';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const payload = document.getElementById('__PUBLIC_PAGE_DATA__')?.textContent;
const pageData = payload ? JSON.parse(payload) as PublicPageData : undefined;
const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
const initialData = pageData?.notFound || pageData?.pathname === pathname ? pageData : undefined;
const app = (
  <React.StrictMode>
    <App initialData={initialData} />
  </React.StrictMode>
);

if (initialData) {
  ReactDOM.hydrateRoot(rootElement, app);
} else {
  // Private routes use the empty application shell; development also renders here.
  rootElement.replaceChildren();
  ReactDOM.createRoot(rootElement).render(app);
}
