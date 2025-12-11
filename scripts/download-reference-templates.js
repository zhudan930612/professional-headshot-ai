import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://osxwjhvlntrornibhkfu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeHdqaHZsbnRyb3JuaWJoa2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Mzg0MTEsImV4cCI6MjA4MTAxNDQxMX0.k83zIxryv2ejZP2uyvj1UmB06baI33G58hXzI5dkk9o';

console.log('📥 从Supabase下载案例图片到本地静态资源\n');
console.log('═'.repeat(80));

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function downloadAllTemplates() {
  try {
    // 获取所有模板
    console.log('\n1️⃣  查询数据库...');
    const { data, error } = await supabase
      .from('reference_templates')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('sort_order');

    if (error) throw error;

    console.log(`   ✅ 找到 ${data.length} 条记录\n`);

    // 创建目录
    console.log('2️⃣  创建目录结构...');
    const baseDir = path.join(__dirname, '../public/reference-templates');

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const categoryFolders = {
      'Corporate': 'corporate',
      'Creative': 'creative',
      'General': 'general',
      'Medical': 'medical',
      'RealEstate': 'realestate',
      'SolidColor': 'solidcolor'
    };

    Object.values(categoryFolders).forEach(folder => {
      const dir = path.join(baseDir, folder);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✅ 创建: ${folder}/`);
      }
    });

    // 下载每张图片
    console.log('\n3️⃣  开始下载图片...\n');

    let downloaded = 0;
    let failed = 0;

    for (const template of data) {
      const url = template.full_url;
      const categoryFolder = categoryFolders[template.category];
      const filename = `${template.template_id}.jpg`;
      const filepath = path.join(baseDir, categoryFolder, filename);

      try {
        // 如果文件已存在，跳过
        if (fs.existsSync(filepath)) {
          console.log(`   ⏭️  跳过: ${categoryFolder}/${filename} (已存在)`);
          continue;
        }

        console.log(`   📥 下载: ${categoryFolder}/${filename}`);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(filepath, buffer);

        downloaded++;
      } catch (err) {
        console.error(`   ❌ 失败: ${categoryFolder}/${filename} - ${err.message}`);
        failed++;
      }
    }

    console.log('\n═'.repeat(80));
    console.log('📊 下载统计:\n');
    console.log(`   ✅ 成功: ${downloaded} 张`);
    console.log(`   ❌ 失败: ${failed} 张`);
    console.log(`   📁 总计: ${data.length} 张`);
    console.log('\n═'.repeat(80));
    console.log('✅ 下载完成！\n');
    console.log('📁 文件位置: public/reference-templates/');
    console.log('\n下一步: 运行 node scripts/generate-constants-from-db.js');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

downloadAllTemplates();
