/**
 * 备份 Supabase 数据库
 *
 * ⚠️ 警告: 在删除生产环境数据之前，必须先运行此脚本备份！
 *
 * 运行方式:
 * npx tsx scripts/backup-database.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 加载环境变量
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少必要的环境变量');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'headshot_ai' },
});

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(process.cwd(), 'backups', timestamp);

  // 创建备份目录
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('📦 开始备份数据库...\n');
  console.log(`备份目录: ${backupDir}\n`);
  console.log('='.repeat(80));

  try {
    // 1. 备份认证用户
    console.log('\n1️⃣ 备份认证用户 (auth.users)...');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) throw authError;

    fs.writeFileSync(
      path.join(backupDir, 'auth_users.json'),
      JSON.stringify(authUsers.users, null, 2)
    );
    console.log(`   ✅ 已备份 ${authUsers.users.length} 个用户`);

    // 2. 备份订阅信息
    console.log('\n2️⃣ 备份订阅信息 (user_subscriptions)...');
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*');

    if (subError) throw subError;

    fs.writeFileSync(
      path.join(backupDir, 'user_subscriptions.json'),
      JSON.stringify(subscriptions, null, 2)
    );
    console.log(`   ✅ 已备份 ${subscriptions?.length || 0} 条订阅记录`);

    // 3. 备份生成会话
    console.log('\n3️⃣ 备份生成会话 (generation_sessions)...');
    const { data: sessions, error: sessError } = await supabaseAdmin
      .from('generation_sessions')
      .select('*');

    if (sessError) throw sessError;

    fs.writeFileSync(
      path.join(backupDir, 'generation_sessions.json'),
      JSON.stringify(sessions, null, 2)
    );
    console.log(`   ✅ 已备份 ${sessions?.length || 0} 条会话记录`);

    // 4. 备份生成图片
    console.log('\n4️⃣ 备份生成图片 (generated_images)...');
    const { data: images, error: imgError } = await supabaseAdmin
      .from('generated_images')
      .select('*');

    if (imgError) throw imgError;

    fs.writeFileSync(
      path.join(backupDir, 'generated_images.json'),
      JSON.stringify(images, null, 2)
    );
    console.log(`   ✅ 已备份 ${images?.length || 0} 条图片记录`);

    // 5. 备份上传文件
    console.log('\n5️⃣ 备份上传文件 (uploaded_files)...');
    const { data: uploads, error: uploadError } = await supabaseAdmin
      .from('uploaded_files')
      .select('*');

    if (uploadError) throw uploadError;

    fs.writeFileSync(
      path.join(backupDir, 'uploaded_files.json'),
      JSON.stringify(uploads, null, 2)
    );
    console.log(`   ✅ 已备份 ${uploads?.length || 0} 条上传记录`);

    // 6. 备份支付记录
    console.log('\n6️⃣ 备份支付记录 (payment_transactions)...');
    const { data: payments, error: payError } = await supabaseAdmin
      .from('payment_transactions')
      .select('*');

    if (payError) throw payError;

    fs.writeFileSync(
      path.join(backupDir, 'payment_transactions.json'),
      JSON.stringify(payments, null, 2)
    );
    console.log(`   ✅ 已备份 ${payments?.length || 0} 条支付记录`);

    // 7. 备份套餐配置
    console.log('\n7️⃣ 备份套餐配置 (subscription_plans)...');
    const { data: plans, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*');

    if (planError) throw planError;

    fs.writeFileSync(
      path.join(backupDir, 'subscription_plans.json'),
      JSON.stringify(plans, null, 2)
    );
    console.log(`   ✅ 已备份 ${plans?.length || 0} 条套餐配置`);

    // 8. 创建备份摘要
    const summary = {
      backup_time: new Date().toISOString(),
      supabase_url: SUPABASE_URL,
      total_users: authUsers.users.length,
      total_subscriptions: subscriptions?.length || 0,
      total_sessions: sessions?.length || 0,
      total_images: images?.length || 0,
      total_uploads: uploads?.length || 0,
      total_payments: payments?.length || 0,
      total_plans: plans?.length || 0
    };

    fs.writeFileSync(
      path.join(backupDir, 'backup_summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ 备份完成！');
    console.log(`\n📁 备份位置: ${backupDir}`);
    console.log('\n📊 备份摘要:');
    console.log(`   用户: ${summary.total_users}`);
    console.log(`   订阅: ${summary.total_subscriptions}`);
    console.log(`   会话: ${summary.total_sessions}`);
    console.log(`   图片: ${summary.total_images}`);
    console.log(`   上传: ${summary.total_uploads}`);
    console.log(`   支付: ${summary.total_payments}`);
    console.log(`   套餐: ${summary.total_plans}`);

    console.log('\n⚠️  注意: 此备份仅包含数据库记录，不包含 Storage 中的实际文件！');
    console.log('   如需备份 Storage 文件，请前往 Supabase Dashboard 手动下载。');

  } catch (error: any) {
    console.error('\n❌ 备份失败:', error.message);
    process.exit(1);
  }
}

backupDatabase();
