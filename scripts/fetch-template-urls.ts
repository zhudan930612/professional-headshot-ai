/**
 * 从 Supabase Storage 获取已上传的模板图片 URL
 * 执行: npx tsx scripts/fetch-template-urls.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 配置
const SUPABASE_URL = 'https://osxwjhvlntrornibhkfu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeHdqaHZsbnRyb3JuaWJoa2Z1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQzODQxMSwiZXhwIjoyMDgxMDE0NDExfQ.G51z-1iZmBmLeRNLce596f_UN-H9Gih2dOIDBTtegdY';
const BUCKET_NAME = 'template-images';
const CATEGORIES = ['corporate', 'creative', 'general', 'medical', 'realestate', 'solidcolor'];

// 初始化客户端(使用Service Role Key以获得完整权限)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'headshot_ai' },
});

async function fetchTemplateUrls() {
  console.log('🔍 从 Supabase Storage 获取模板图片 URL...\n');

  const urlMapping: Record<string, string> = {};
  let totalFiles = 0;

  // 先检查bucket根目录
  console.log('📂 检查 bucket 根目录...');
  const { data: rootFiles, error: rootError } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', {
      limit: 200,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (rootError) {
    console.error(`❌ 获取根目录失败:`, rootError.message);
  } else if (rootFiles && rootFiles.length > 0) {
    console.log(`✅ 找到 ${rootFiles.length} 个项目:`);
    rootFiles.forEach(item => {
      console.log(`   - ${item.name} (${item.metadata ? 'folder' : 'file'})`);
    });
    console.log();
  }

  // 扫描每个类别目录
  for (const category of CATEGORIES) {
    console.log(`📂 扫描类别: ${category}`);

    // 列出该类别下的所有文件
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(category, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error(`❌ 获取 ${category} 文件列表失败:`, error.message);
      continue;
    }

    if (!files || files.length === 0) {
      console.warn(`⚠️  ${category} 目录为空`);
      continue;
    }

    // 为每个文件生成公开 URL
    for (const file of files) {
      const storagePath = `${category}/${file.name}`;

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      urlMapping[storagePath] = publicUrl;
      console.log(`  ✅ ${file.name} → ${publicUrl}`);
      totalFiles++;
    }

    console.log();
  }

  // 保存到 JSON 文件
  const outputPath = 'scripts/template-urls.json';
  fs.writeFileSync(outputPath, JSON.stringify(urlMapping, null, 2), 'utf-8');

  console.log('========================================');
  console.log(`✅ 共找到 ${totalFiles} 个模板文件`);
  console.log(`📄 URL 映射已保存到: ${outputPath}`);
  console.log('========================================\n');

  // 显示示例
  if (totalFiles > 0) {
    const firstKey = Object.keys(urlMapping)[0];
    console.log('示例 URL:');
    console.log(`  ${firstKey}`);
    console.log(`  → ${urlMapping[firstKey]}`);
  }
}

fetchTemplateUrls().catch(console.error);
