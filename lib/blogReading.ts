const emoji = /[\p{Extended_Pictographic}\uFE0F\u200D\u2705\u2714\u274C]/gu;

export function prepareReadingMarkdown(markdown: string): string {
  return markdown.replace(emoji, '')
    .replace(/^[\t ]*\*\*Why this matters\*\*[\t ]*$/gm, '')
    .replace(/^---[\t ]*$/gm, '')
    .replace(/^•\s*/gm, '- ')
    .replace(/^(#{2,4})\s+(?:\d+\.\s*)?/gm, '$1 ');
}

const shortHeadings: Record<string, string> = {
  'Your Resume Photo Can Make or Break First Impressions': 'First impressions',
  'Overly Edited or Heavily Filtered Photos': 'Heavy editing and filters',
  'The LinkedIn Paradox: More Visibility Doesn&#39;t Always Help': 'Visibility and first impressions',
  'The Hidden Requirements of Headshots on Different Platforms': 'Different platform requirements',
  'The Authenticity Test: Does It Still Look Like You?': 'Checking your likeness',
  'Why &quot;Looking Like You&quot; Beats &quot;Looking Good&quot;': 'Prioritizing a recognizable face',
  'The Technical Elements That Actually Impact Perception': 'Image quality and framing',
  'Framing/Background (Less Critical - 10% of quality)': 'Framing and background',
  'Profile or More Turned, Different Expression': 'A different angle and expression',
  '&quot;I Don&#39;t Look Like Me&quot;': 'When likeness changes',
  '&quot;The AI Changed My Gender Expression&quot;': 'When presentation changes',
  '&quot;I Look Like a Different Ethnicity&quot;': 'When facial features change',
  '&quot;I Look Too Old/Too Young&quot;': 'When age appears different',
  'The &quot;No Makeup vs. Makeup&quot; Balance': 'Keeping styling consistent',
  'The &quot;Background Contrast&quot; Strategy': 'Background contrast',
  'The Power of First Impressions Through Clothing': 'What your clothes communicate',
  'Color Psychology: Choose Colors That Work for You': 'Choosing colors',
  'Why Industry Matters in Professional Photography': 'Choosing for your industry',
  'The Scientific Formula: Getting Maximum Variation': 'Varying your photos',
  'Tech &amp; Startups: Innovation Meets Approachability': 'Tech and startups',
  'Finance, Banking &amp; Legal: Trust Through Tradition': 'Finance and law',
  'Creative, Marketing &amp; Media: Personality With Professionalism': 'Creative professions',
  'Healthcare &amp; Medical: Compassion Meets Competence': 'Healthcare',
  'Real Estate &amp; Sales: Success Meets Approachability': 'Real estate and sales',
  'Academic &amp; Education: Knowledge With Warmth': 'Education',
};

export function formatReadingHtml(html: string): string {
  let section = 0;
  return html.replace(emoji, '').replace(/<hr\s*\/?>(\s*)/g, '')
    .replace(/<p>\s*<strong>Why this matters<\/strong>\s*(?:<br\s*\/?>)?/g, '<p>')
    .replace(/<h([234])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/g, (_match, level: string, text: string) => {
      const plain = text.replace(/<\/?strong>/g, '').trim().replace(/^\d+\.\s*/, '').replace(/^(?:Mistake #?\d+|Failure Case \d+|Tip \d+|Photo \d+):\s*/i, '');
      const title = shortHeadings[plain] || plain;
      return `<h${level}${level === '2' ? ` id="section-${++section}"` : ''}>${title}</h${level}>`;
    });
}

export const getArticleSections = (html: string) => [...html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(match => ({
  id: match[1], title: match[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
}));
