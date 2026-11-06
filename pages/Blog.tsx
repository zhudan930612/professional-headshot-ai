import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BLOG_POSTS } from '@/constants';
import { Layout } from '@/components/Layout';
import { BlogCover } from '@/components/BlogCover';
import { getBlogPresentation } from '@/lib/blogPresentation';
import './blog.css';

export const Blog = () => {
  const [active, setActive] = useState(BLOG_POSTS[0].slug);
  const [previews, setPreviews] = useState([BLOG_POSTS[0].slug]);
  const ready = useRef(new Set<string>());
  const requested = useRef<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frames = useRef<number[]>([]);

  const cancelPreview = () => {
    clearTimeout(hoverTimer.current);
    requested.current = null;
    frames.current.forEach(cancelAnimationFrame);
    frames.current = [];
  };
  useEffect(() => cancelPreview, []);

  const reveal = (slug: string) => {
    // Paint the decoded image at opacity zero before starting the crossfade.
    frames.current.push(requestAnimationFrame(() => {
      if (requested.current !== slug) return;
      frames.current.push(requestAnimationFrame(() => {
        if (requested.current === slug) setActive(slug);
      }));
    }));
  };
  const requestPreview = (slug: string, delay: number) => {
    cancelPreview();
    requested.current = slug;
    hoverTimer.current = setTimeout(() => {
      if (requested.current !== slug) return;
      setPreviews(items => items.includes(slug) ? items : [...items, slug]);
      if (ready.current.has(slug)) reveal(slug);
    }, delay);
  };
  const imageReady = async (slug: string, image: HTMLImageElement) => {
    try { await image.decode?.(); } catch { return; }
    ready.current.add(slug);
    if (requested.current === slug) reveal(slug);
  };
  return <Layout editorial>
    <div className="journal">
      <div className="journal-masthead" aria-label="Portrait examples">
        {BLOG_POSTS.slice(0, 4).map(post => <BlogCover key={post.slug} slug={post.slug} priority />)}
      </div>
      <header className="journal-intro">
        <div><p>Clothing, light and the photos you bring. Practical reading before your next professional portrait.</p>
          <a className="journal-action" href="#articles">Browse guides</a></div>
        <h1>Headshot guides</h1>
      </header>
      <section id="articles" className="journal-index" aria-labelledby="articles-heading">
        <aside className="journal-preview">
          <figure className="journal-preview-stack">
            {previews.map(slug => {
              const info = getBlogPresentation(slug);
              const visible = slug === active;
              return <img key={slug} src={info.cover} alt={visible ? info.coverAlt : ''}
                width={896} height={1200} decoding="async" aria-hidden={!visible}
                data-active={visible} className="journal-photo journal-preview-layer"
                onLoad={event => { void imageReady(slug, event.currentTarget); }} />;
            })}
          </figure>
          <p>{getBlogPresentation(active).summary}</p>
        </aside>
        <div className="journal-list">
          <h2 id="articles-heading">Choose your next read</h2>
          {BLOG_POSTS.map((post, index) => {
            const info = getBlogPresentation(post.slug);
            return <Link key={post.slug} to={`/blog/${post.slug}`} className="journal-row"
              style={{ '--i': index } as React.CSSProperties}
              onMouseEnter={() => requestPreview(post.slug, 140)} onMouseLeave={cancelPreview}
              onFocus={() => requestPreview(post.slug, 0)} onBlur={cancelPreview}>
              <BlogCover slug={post.slug} />
              <div><h3>{info.displayTitle}</h3><p>{info.summary}</p><span>{post.readTime}</span></div>
            </Link>;
          })}
        </div>
      </section>
      <p className="journal-credit">AI-generated portrait examples.</p>
    </div>
  </Layout>;
};
