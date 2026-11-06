import { marked } from 'marked';
import matter from 'gray-matter';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/atom-one-dark.css';
import { Buffer } from 'buffer';

for (const [name, language] of Object.entries({ javascript, typescript, json, bash, css, xml })) {
  hljs.registerLanguage(name, language);
}

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

// 配置 marked 使用 highlight.js 进行代码高亮
marked.use({
  renderer: {
    code({ text, lang }) {
      const language = lang?.split(/\s+/)[0];
      if (!language || !hljs.getLanguage(language)) return false;
      const highlighted = hljs.highlight(text, { language }).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>\n`;
    },
  },
  breaks: true,
  gfm: true,
});

export interface BlogMetadata {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
}

export interface ParsedBlog {
  metadata: BlogMetadata;
  html: string;
}

/**
 * 解析 Markdown 文件
 * @param filePath - Markdown 文件的公开访问路径
 * @returns 解析后的博客元数据和 HTML 内容
 */
export const parseMarkdown = async (markdown: string): Promise<ParsedBlog> => {
  const { data, content } = matter(markdown);
  for (const field of ['id', 'slug', 'title', 'excerpt', 'date', 'readTime']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`Invalid blog metadata: ${field}`);
  }
  if (!content.trim()) throw new Error(`Empty blog article: ${data.slug}`);
  // The page already renders the title. Keep one visible article heading.
  const lines = content.trimStart().split('\n');
  const body = lines[0].trim() === `# ${data.title}` ? lines.slice(1).join('\n') : content;
  return { metadata: data as BlogMetadata, html: await marked(body) };
};

export const parseMarkdownFile = async (filePath: string, signal?: AbortSignal): Promise<ParsedBlog> => {
  try {
    const response = await fetch(filePath, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch markdown file: ${response.statusText}`);
    }

    const markdown = await response.text();
    return await parseMarkdown(markdown);
  } catch (error) {
    console.error('Error parsing markdown file:', error);
    throw error;
  }
};
