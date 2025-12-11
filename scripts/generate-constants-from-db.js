import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://osxwjhvlntrornibhkfu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeHdqaHZsbnRyb3JuaWJoa2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Mzg0MTEsImV4cCI6MjA4MTAxNDQxMX0.k83zIxryv2ejZP2uyvj1UmB06baI33G58hXzI5dkk9o';

console.log('🔧 生成constants.ts（使用静态资源路径）\n');
console.log('═'.repeat(80));

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function generateConstants() {
  try {
    console.log('\n1️⃣  查询数据库...');
    const { data, error } = await supabase
      .from('reference_templates')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('sort_order');

    if (error) throw error;

    console.log(`   ✅ 找到 ${data.length} 条记录\n`);

    console.log('2️⃣  生成代码...\n');

    // 读取现有constants.ts以保留其他内容
    const constantsPath = path.join(__dirname, '../constants.ts');
    let existingContent = '';

    if (fs.existsSync(constantsPath)) {
      existingContent = fs.readFileSync(constantsPath, 'utf-8');
    }

    // 提取非模板相关的内容（保留FAQ, BLOG等）
    const extractSection = (content, start, end) => {
      const startIdx = content.indexOf(start);
      const endIdx = content.indexOf(end, startIdx);
      if (startIdx !== -1 && endIdx !== -1) {
        return content.substring(startIdx, endIdx + end.length);
      }
      return '';
    };

    const faqSection = extractSection(existingContent, 'export const FAQ_ITEMS', '];');
    const blogSection = extractSection(existingContent, 'export const BLOG_POSTS', '];');

    // 生成新的constants.ts
    let output = `import { HeadshotStyle, HeadshotTemplate } from './types';\n\n`;
    output += `export const DAILY_LIMIT = 100;\n\n`;
    output += `// 案例模板（静态资源）- 96张图片\n`;
    output += `// 图片位置: public/reference-templates/\n`;
    output += `const BASE_TEMPLATES: Omit<HeadshotTemplate, 'id'>[] = [\n`;

    const categoryFolders = {
      'Corporate': 'corporate',
      'Creative': 'creative',
      'General': 'general',
      'Medical': 'medical',
      'RealEstate': 'realestate',
      'SolidColor': 'solidcolor'
    };

    data.forEach((template, index) => {
      const categoryFolder = categoryFolders[template.category];

      output += `  {\n`;
      output += `    templateId: '${template.template_id}',\n`;
      output += `    label: '${template.name}',\n`;
      output += `    name: '${template.name}',\n`;
      output += `    category: HeadshotStyle.${template.category},\n`;
      output += `    imageUrl: '/reference-templates/${categoryFolder}/${template.template_id}.jpg'\n`;
      output += `  }${index < data.length - 1 ? ',' : ''}\n`;
    });

    output += `];\n\n`;
    output += `// 生成完整的模板列表（兼容现有代码）\n`;
    output += `export const HEADSHOT_TEMPLATES: HeadshotTemplate[] = BASE_TEMPLATES.map((template) => ({\n`;
    output += `  ...template,\n`;
    output += `  id: template.templateId,\n`;
    output += `}));\n\n`;

    // 添加STYLE_OPTIONS（从现有代码提取或手写）
    output += `export const STYLE_OPTIONS = [\n`;
    output += `  { value: HeadshotStyle.Corporate, label: 'Corporate', desc: 'Suit and tie, studio background' },\n`;
    output += `  { value: HeadshotStyle.General, label: 'General', desc: 'Blazer, open collar, office blur' },\n`;
    output += `  { value: HeadshotStyle.Creative, label: 'Creative', desc: 'Artistic lighting, modern background' },\n`;
    output += `  { value: HeadshotStyle.Medical, label: 'Medical', desc: 'White coat, clinical setting' },\n`;
    output += `];\n\n`;

    output += `export const USE_CASE_OPTIONS = [\n`;
    output += `  { value: UseCase.LinkedIn, label: 'LinkedIn', icon: 'briefcase' },\n`;
    output += `  { value: UseCase.Resume, label: 'Resume / CV', icon: 'file-text' },\n`;
    output += `  { value: UseCase.Portfolio, label: 'Personal Website', icon: 'globe' },\n`;
    output += `  { value: UseCase.SocialMedia, label: 'Social Media', icon: 'user' },\n`;
    output += `];\n\n`;

    // 添加FAQ和BLOG（如果存在）
    if (faqSection) {
      output += faqSection + '\n\n';
    } else {
      output += `export const FAQ_ITEMS = [\n`;
      output += `  {\n`;
      output += `    question: "What is a professional headshot?",\n`;
      output += `    answer: "A professional headshot is a high-quality photo focused on your face, typically used for business profiles like LinkedIn, resumes, and company websites to convey professionalism and approachability."\n`;
      output += `  },\n`;
      output += `  {\n`;
      output += `    question: "Do I really just need selfies to start?",\n`;
      output += `    answer: "Yes! Our AI analyzes your facial features from 3-10 varied selfies to construct a photorealistic professional image. No studio required."\n`;
      output += `  },\n`;
      output += `  {\n`;
      output += `    question: "How many headshots can I generate per day?",\n`;
      output += `    answer: \`Currently, our free plan allows you to generate up to \${DAILY_LIMIT} headshots every 24 hours. The quota resets at midnight UTC.\`\n`;
      output += `  },\n`;
      output += `  {\n`;
      output += `    question: "Will the headshots still look like me?",\n`;
      output += `    answer: "We strive for high fidelity. The more angles and lighting conditions you provide in your input selfies, the more accurate the result will be."\n`;
      output += `  },\n`;
      output += `  {\n`;
      output += `    question: "Is my data private?",\n`;
      output += `    answer: "Absolutely. Your uploaded photos are processed solely for the purpose of generating your headshots and are deleted from our processing servers shortly after generation."\n`;
      output += `  }\n`;
      output += `];\n\n`;
    }

    if (blogSection) {
      output += blogSection + '\n';
    } else {
      output += `export const BLOG_POSTS = [\n`;
      output += `  {\n`;
      output += `    id: '1',\n`;
      output += `    title: 'What to Wear for a Professional Headshot',\n`;
      output += `    excerpt: 'Discover the best color palettes and clothing styles to make your LinkedIn profile stand out.',\n`;
      output += `    date: 'Oct 12, 2023',\n`;
      output += `    readTime: '5 min read'\n`;
      output += `  },\n`;
      output += `  {\n`;
      output += `    id: '2',\n`;
      output += `    title: 'Top 5 Mistakes in Resume Photos',\n`;
      output += `    excerpt: 'Are you making these common errors? Learn how to fix your CV image instantly.',\n`;
      output += `    date: 'Nov 04, 2023',\n`;
      output += `    readTime: '4 min read'\n`;
      output += `  },\n`;
      output += `  {\n`;
      output += `    id: '3',\n`;
      output += `    title: 'Lighting 101: Studio vs. Natural',\n`;
      output += `    excerpt: 'Understanding how lighting affects the mood and professionalism of your portrait.',\n`;
      output += `    date: 'Dec 01, 2023',\n`;
      output += `    readTime: '6 min read'\n`;
      output += `  }\n`;
      output += `];\n`;
    }

    // 保存新文件
    fs.writeFileSync(constantsPath, output);
    console.log(`   ✅ 已生成 ${data.length} 个模板配置\n`);

    console.log('═'.repeat(80));
    console.log('✅ 生成完成！\n');
    console.log('📁 文件位置: constants.ts');
    console.log('\n下一步: 更新 HeroTool.tsx 使用静态资源');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

generateConstants();
