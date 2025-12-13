/**
 * 自动更新 constants.ts 中的模板 URL
 * 执行: npx tsx scripts/update-constants.ts
 */

import fs from 'fs';

const URL_MAPPING_FILE = 'scripts/template-urls.json';
const CONSTANTS_FILE = 'constants.ts';

console.log('🔄 开始更新 constants.ts 中的模板 URL...\n');

// 读取 URL 映射
const urlMapping: Record<string, string> = JSON.parse(
  fs.readFileSync(URL_MAPPING_FILE, 'utf-8')
);

console.log(`📄 读取 URL 映射: ${Object.keys(urlMapping).length} 个URL\n`);

// 读取 constants.ts
let constantsContent = fs.readFileSync(CONSTANTS_FILE, 'utf-8');

let replacedCount = 0;
const replacements: Array<{old: string; new: string}> = [];

// 替换所有相对路径为 Supabase URL
for (const [storagePath, publicUrl] of Object.entries(urlMapping)) {
  const oldUrl = `/reference-templates/${storagePath}`;

  if (constantsContent.includes(oldUrl)) {
    constantsContent = constantsContent.replace(oldUrl, publicUrl);
    replacedCount++;

    // 记录前5个替换示例
    if (replacedCount <= 5) {
      replacements.push({ old: oldUrl, new: publicUrl });
    }
  }
}

// 写回文件
fs.writeFileSync(CONSTANTS_FILE, constantsContent, 'utf-8');

console.log('========================================');
console.log(`✅ 已更新 ${replacedCount} 个模板 URL`);
console.log(`📄 文件已更新: ${CONSTANTS_FILE}`);
console.log('========================================\n');

if (replacements.length > 0) {
  console.log('替换示例:');
  replacements.forEach(({old, new: newUrl}, i) => {
    console.log(`${i + 1}. ${old}`);
    console.log(`   → ${newUrl}\n`);
  });
}

console.log('✅ 完成! constants.ts 已成功更新');
