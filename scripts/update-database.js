import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从环境变量加载配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://osxwjhvlntrornibhkfu.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeHdqaHZsbnRyb3JuaWJoa2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Mzg0MTEsImV4cCI6MjA4MTAxNDQxMX0.k83zIxryv2ejZP2uyvj1UmB06baI33G58hXzI5dkk9o';

console.log('🚀 开始数据库更新...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function executeSQLFile(filePath, description) {
  console.log(`📄 执行: ${description}`);
  console.log(`   文件: ${filePath}`);

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');

    // 注意：Supabase JS客户端不能直接执行DDL语句
    // 我们需要使用Supabase的RPC功能或者Management API
    console.log('⚠️  警告: Supabase JS客户端不支持直接执行DDL语句');
    console.log('   请手动在Supabase Dashboard中执行以下SQL:\n');
    console.log('─'.repeat(80));
    console.log(sql.substring(0, 500) + '...\n');
    console.log('─'.repeat(80));

    return false;
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    return false;
  }
}

async function executeInsertStatements() {
  console.log('\n📊 执行INSERT语句...');

  try {
    const insertSQL = fs.readFileSync(
      path.join(__dirname, '../database/insert-reference-templates.sql'),
      'utf-8'
    );

    // 解析INSERT语句，逐条执行
    console.log('   正在准备96条INSERT语句...\n');

    // 使用Supabase客户端插入数据
    const templates = [];

    // 手动构建数据（因为无法直接执行SQL）
    const categories = ['Corporate', 'Creative', 'General', 'Medical', 'RealEstate', 'SolidColor'];
    const categoryFolders = ['Corporate', 'Creative', 'General', 'Medical', 'Realestate', 'Solidcolor'];

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const folder = categoryFolders[i];
      const prefix = folder.toLowerCase();

      for (let num = 1; num <= 16; num++) {
        const numStr = num.toString().padStart(2, '0');
        const fileName = `${prefix}_${numStr}.jpg`;

        templates.push({
          template_id: `${prefix}_${numStr}`,
          name: `${category} Professional ${numStr}`,
          category: category,
          storage_path: `${folder}/${fileName}`,
          full_url: `https://osxwjhvlntrornibhkfu.supabase.co/storage/v1/object/public/reference-templates/${folder}/${fileName}`,
          thumbnail_url: `https://osxwjhvlntrornibhkfu.supabase.co/storage/v1/object/public/reference-templates/${folder}/${fileName}`,
          is_active: true,
          sort_order: num
        });
      }
    }

    console.log(`   准备插入 ${templates.length} 条记录...\n`);

    // 批量插入
    const { data, error } = await supabase
      .from('reference_templates')
      .insert(templates)
      .select();

    if (error) {
      console.error(`❌ 插入失败: ${error.message}`);
      console.error(`   详情: ${error.details || '无'}`);
      console.error(`   提示: ${error.hint || '无'}`);
      return false;
    }

    console.log(`✅ 成功插入 ${data?.length || templates.length} 条记录\n`);
    return true;

  } catch (error) {
    console.error(`❌ 执行失败: ${error.message}`);
    return false;
  }
}

async function verifyData() {
  console.log('🔍 验证数据...\n');

  try {
    const { data, error } = await supabase
      .from('reference_templates')
      .select('category', { count: 'exact' });

    if (error) {
      console.error(`❌ 查询失败: ${error.message}`);
      return false;
    }

    // 按分类统计
    const categoryCounts = {};
    data.forEach(row => {
      categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;
    });

    console.log('   分类统计:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const status = count === 16 ? '✅' : '⚠️';
      console.log(`   ${status} ${category}: ${count} 条记录`);
    });

    const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
    console.log(`\n   总计: ${total} 条记录 ${total === 96 ? '✅' : '⚠️'}\n`);

    return total === 96;

  } catch (error) {
    console.error(`❌ 验证失败: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('═'.repeat(80));
  console.log('  数据库更新脚本');
  console.log('  Supabase URL:', SUPABASE_URL);
  console.log('═'.repeat(80));
  console.log();

  // 步骤1: 提示Schema更新
  console.log('📋 步骤1: Schema更新');
  console.log('   ⚠️  请手动在Supabase Dashboard执行以下操作:');
  console.log('   1. 登录 https://app.supabase.com/');
  console.log('   2. 进入项目 osxwjhvlntrornibhkfu');
  console.log('   3. 点击 SQL Editor → New query');
  console.log('   4. 复制粘贴 database/schema.sql 中的新增内容（第54行开始）');
  console.log('   5. 点击 Run 执行\n');

  console.log('   按任意键继续执行INSERT语句...');

  // 步骤2: 执行INSERT
  console.log('\n📋 步骤2: 插入案例图片数据\n');
  const insertSuccess = await executeInsertStatements();

  if (!insertSuccess) {
    console.log('❌ 数据插入失败，请检查错误信息\n');
    process.exit(1);
  }

  // 步骤3: 验证数据
  console.log('📋 步骤3: 验证数据\n');
  const verifySuccess = await verifyData();

  if (!verifySuccess) {
    console.log('⚠️  数据验证未通过，请检查数据库\n');
  }

  console.log('═'.repeat(80));
  console.log('✅ 数据库更新完成！');
  console.log('═'.repeat(80));
}

main().catch(console.error);
