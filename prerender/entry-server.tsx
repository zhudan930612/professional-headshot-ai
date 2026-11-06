import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { PassThrough } from 'node:stream';
import { AppContent } from '@/App';
import type { PublicPageData } from '@/types';

export { parseMarkdown } from '@/utils/markdownParser';

export const renderPublicPage = (data: PublicPageData): Promise<string> => new Promise((resolve, reject) => {
  const output = new PassThrough();
  let html = '';
  let failed = false;
  output.setEncoding('utf8');
  output.on('data', (chunk: string) => { html += chunk; });
  output.on('end', () => { if (!failed) resolve(html); });
  output.on('error', reject);
  const stream = renderToPipeableStream(
    <React.StrictMode>
      <StaticRouter location={data.pathname}>
        <AppContent initialData={data} />
      </StaticRouter>
    </React.StrictMode>,
    {
      onAllReady() { stream.pipe(output); },
      onError(error: unknown) { failed = true; reject(error); },
    },
  );
});
