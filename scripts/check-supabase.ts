/**
 * Supabase 配置检查脚本
 * 用途: 验证本地环境变量和 Supabase 连接是否正常
 * 运行: npx tsx scripts/check-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Supabase 配置检查工具\n');

// 1. 检查环境变量
console.log('📋 Step 1: 检查环境变量');
console.log('─'.repeat(50));

if (!SUPABASE_URL) {
  console.log('❌ VITE_SUPABASE_URL 未配置');
  process.exit(1);
} else {
  console.log('✅ VITE_SUPABASE_URL:', SUPABASE_URL);
}

if (!SUPABASE_ANON_KEY) {
  console.log('❌ VITE_SUPABASE_ANON_KEY 未配置');
  process.exit(1);
} else {
  console.log('✅ VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
}

console.log();

// 2. 测试 Supabase 连接
console.log('📡 Step 2: 测试 Supabase 连接');
console.log('─'.repeat(50));

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'headshot_ai' },
});

async function checkConnection() {
  try {
    // 测试基本连接（使用 generation_sessions 表代替已废弃的 user_quotas）
    const { data, error } = await supabase.from('generation_sessions').select('count').limit(1);

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('✅ 数据库连接成功 (表为空,正常)');
      } else if (error.message.includes('row-level security')) {
        console.log('⚠️  数据库连接成功,但 RLS 策略缺失');
        console.log('   错误:', error.message);
        console.log('   → 需要执行 database/rls-policies.sql');
      } else {
        console.log('❌ 数据库查询失败:', error.message);
      }
    } else {
      console.log('✅ 数据库连接成功,查询到', data?.length || 0, '条记录');
    }
  } catch (err: any) {
    console.log('❌ 连接失败:', err.message);
  }
}

async function checkStorageBuckets() {
  console.log('\n📦 Step 3: 检查 Storage Buckets');
  console.log('─'.repeat(50));

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.log('❌ 无法获取 Buckets 列表:', error.message);
      return;
    }

    const requiredBuckets = ['user-uploads', 'generated-headshots'];
    const existingBuckets = buckets?.map(b => b.name) || [];

    requiredBuckets.forEach(name => {
      if (existingBuckets.includes(name)) {
        const bucket = buckets?.find(b => b.name === name);
        console.log(`✅ Bucket "${name}" 存在 (Public: ${bucket?.public ? '✅' : '❌'})`);
      } else {
        console.log(`❌ Bucket "${name}" 不存在`);
        console.log(`   → 请在 Supabase Dashboard > Storage 创建`);
      }
    });
  } catch (err: any) {
    console.log('❌ 检查失败:', err.message);
  }
}

async function checkTables() {
  console.log('\n📊 Step 4: 检查数据库表');
  console.log('─'.repeat(50));

  const tables = ['generation_sessions', 'generated_images', 'uploaded_files', 'user_subscriptions'];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.log(`⚠️  表 "${table}" 不存在或为空`);
        } else if (error.message.includes('row-level security')) {
          console.log(`⚠️  表 "${table}" 存在,但 RLS 策略未配置`);
        } else {
          console.log(`❌ 表 "${table}" 查询失败:`, error.message);
        }
      } else {
        console.log(`✅ 表 "${table}" 正常`);
      }
    } catch (err: any) {
      console.log(`❌ 表 "${table}" 检查失败:`, err.message);
    }
  }
}

async function testUpload() {
  console.log('\n🧪 Step 5: 测试文件上传');
  console.log('─'.repeat(50));

  try {
    const testFileName = `test_${Date.now()}.txt`;
    const testFilePath = `anon_test/${testFileName}`;
    const testContent = new Blob(['Hello Supabase!'], { type: 'text/plain' });

    const { data, error } = await supabase.storage
      .from('user-uploads')
      .upload(testFilePath, testContent, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.log('❌ 测试上传失败:', error.message);
      if (error.message.includes('row-level security')) {
        console.log('   → 需要在 Supabase 执行 RLS 策略 SQL');
      } else if (error.message.includes('Bucket not found')) {
        console.log('   → 需要创建 "user-uploads" bucket');
      }
    } else {
      console.log('✅ 测试上传成功,文件路径:', data.path);

      // 清理测试文件
      await supabase.storage.from('user-uploads').remove([testFilePath]);
      console.log('✅ 测试文件已清理');
    }
  } catch (err: any) {
    console.log('❌ 上传测试失败:', err.message);
  }
}

// 执行所有检查
async function runAllChecks() {
  await checkConnection();
  await checkStorageBuckets();
  await checkTables();
  await testUpload();

  console.log('\n' + '='.repeat(50));
  console.log('🎯 检查完成!');
  console.log('='.repeat(50));
  console.log('\n如果有 ❌ 或 ⚠️  标记,请按以下步骤修复:\n');
  console.log('1. 打开 Supabase Dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]}\n`);
  console.log('2. 创建 Storage Buckets (如果缺失):');
  console.log('   - user-uploads (Public: ✅)');
  console.log('   - generated-headshots (Public: ✅)\n');
  console.log('3. 执行 RLS 策略 SQL:');
  console.log('   → SQL Editor > 粘贴 database/rls-policies.sql > Run\n');
  console.log('4. 重新运行本脚本验证:');
  console.log('   npx tsx scripts/check-supabase.ts\n');
}

runAllChecks().catch(console.error);
