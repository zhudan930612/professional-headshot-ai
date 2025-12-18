import { marked } from 'marked';
import matter from 'gray-matter';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { Buffer } from 'buffer';

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

// 配置 marked 使用 highlight.js 进行代码高亮
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (e) {
        console.error('Highlight error:', e);
      }
    }
    try {
      return hljs.highlightAuto(code).value;
    } catch (e) {
      console.error('Auto-highlight error:', e);
      return code;
    }
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
export const parseMarkdownFile = async (filePath: string): Promise<ParsedBlog> => {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch markdown file: ${response.statusText}`);
    }

    const markdown = await response.text();
    const { data, content } = matter(markdown);
    const html = await marked(content);

    return {
      metadata: data as BlogMetadata,
      html: html as string,
    };
  } catch (error) {
    console.error('Error parsing markdown file:', error);
    throw error;
  }
};
