/**
 * 删除所有用户数据（生产环境专用）
 *
 * ⚠️⚠️⚠️ 极度危险的操作！⚠️⚠️⚠️
 *
 * 此脚本将永久删除：
 * - 所有用户账号 (auth.users)
 * - 所有订阅记录 (user_subscriptions)
 * - 所有生成会话 (generation_sessions)
 * - 所有生成图片 (generated_images)
 * - 所有上传文件 (uploaded_files)
 * - 所有支付记录 (payment_transactions)
 * - Storage 中的所有用户文件
 *
 * 运行前必须：
 * 1. 运行备份脚本: npx tsx scripts/backup-database.ts
 * 2. 确认备份成功
 * 3. 三次确认删除操作
 *
 * 运行方式:
 * npx tsx scripts/delete-all-users.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// 加载环境变量
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少必要的环境变量');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 创建命令行交互
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function showCurrentData() {
  console.log('\n📊 当前数据库统计:\n');
  console.log('='.repeat(80));

  try {
    // 统计用户
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    console.log(`\n👥 用户数量: ${authUsers?.users.length || 0}`);

    // 统计订阅
    const { data: subscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('plan_type', { count: 'exact' });
    console.log(`💳 订阅记录: ${subscriptions?.length || 0}`);

    // 统计会话
    const { data: sessions } = await supabaseAdmin
      .from('generation_sessions')
      .select('*', { count: 'exact' });
    console.log(`📸 生成会话: ${sessions?.length || 0}`);

    // 统计图片
    const { data: images } = await supabaseAdmin
      .from('generated_images')
      .select('*', { count: 'exact' });
    console.log(`🖼️  生成图片: ${images?.length || 0}`);

    // 统计上传
    const { data: uploads } = await supabaseAdmin
      .from('uploaded_files')
      .select('*', { count: 'exact' });
    console.log(`📁 上传文件: ${uploads?.length || 0}`);

    // 统计支付
    const { data: payments } = await supabaseAdmin
      .from('payment_transactions')
      .select('*', { count: 'exact' });
    console.log(`💰 支付记录: ${payments?.length || 0}`);

    console.log('\n' + '='.repeat(80));

    return {
      users: authUsers?.users.length || 0,
      subscriptions: subscriptions?.length || 0,
      sessions: sessions?.length || 0,
      images: images?.length || 0,
      uploads: uploads?.length || 0,
      payments: payments?.length || 0
    };
  } catch (error: any) {
    console.error('❌ 查询失败:', error.message);
    process.exit(1);
  }
}

async function deleteAllData() {
  console.log('\n🔥 开始删除数据...\n');
  console.log('='.repeat(80));

  try {
    // 1. 删除生成图片
    console.log('\n1️⃣ 删除生成图片 (generated_images)...');
    const { error: imgError } = await supabaseAdmin
      .from('generated_images')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有

    if (imgError) throw new Error(`删除图片失败: ${imgError.message}`);
    console.log('   ✅ 已删除所有图片记录');

    // 2. 删除生成会话
    console.log('\n2️⃣ 删除生成会话 (generation_sessions)...');
    const { error: sessError } = await supabaseAdmin
      .from('generation_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (sessError) throw new Error(`删除会话失败: ${sessError.message}`);
    console.log('   ✅ 已删除所有会话记录');

    // 3. 删除上传文件
    console.log('\n3️⃣ 删除上传文件 (uploaded_files)...');
    const { error: uploadError } = await supabaseAdmin
      .from('uploaded_files')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (uploadError) throw new Error(`删除上传文件失败: ${uploadError.message}`);
    console.log('   ✅ 已删除所有上传文件记录');

    // 4. 删除支付记录
    console.log('\n4️⃣ 删除支付记录 (payment_transactions)...');
    const { error: payError } = await supabaseAdmin
      .from('payment_transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (payError) throw new Error(`删除支付记录失败: ${payError.message}`);
    console.log('   ✅ 已删除所有支付记录');

    // 5. 删除订阅信息
    console.log('\n5️⃣ 删除订阅信息 (user_subscriptions)...');
    const { error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (subError) throw new Error(`删除订阅失败: ${subError.message}`);
    console.log('   ✅ 已删除所有订阅记录');

    // 6. 删除认证用户
    console.log('\n6️⃣ 删除认证用户 (auth.users)...');
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

    if (authUsers && authUsers.users.length > 0) {
      for (const user of authUsers.users) {
        const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (userError) {
          console.warn(`   ⚠️  删除用户 ${user.email} 失败: ${userError.message}`);
        }
      }
      console.log(`   ✅ 已删除 ${authUsers.users.length} 个用户`);
    }

    // 7. 清空 Storage
    console.log('\n7️⃣ 清空 Storage (user-uploads 和 generated-headshots)...');
    console.log('   ⚠️  注意: Storage 文件需要手动在 Dashboard 中删除');
    console.log('   访问: https://supabase.com/dashboard/project/osxwjhvlntrornibhkfu/storage/buckets');

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ 数据删除完成！');

    // 验证删除
    console.log('\n📊 验证删除结果...\n');
    const stats = await showCurrentData();

    if (stats.users === 0 && stats.subscriptions === 0 && stats.sessions === 0) {
      console.log('\n✅ 所有数据已成功删除！');
    } else {
      console.log('\n⚠️  部分数据可能未完全删除，请检查上方统计信息。');
    }

  } catch (error: any) {
    console.error('\n❌ 删除失败:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('\n' + '🚨'.repeat(40));
  console.log('\n⚠️⚠️⚠️  危险操作警告  ⚠️⚠️⚠️');
  console.log('\n此操作将永久删除所有用户数据，包括：');
  console.log('  • 所有用户账号');
  console.log('  • 所有订阅和配额信息');
  console.log('  • 所有生成的头像');
  console.log('  • 所有上传的参考图');
  console.log('  • 所有支付记录');
  console.log('\n数据删除后无法恢复！');
  console.log('\n' + '🚨'.repeat(40));

  // 显示当前数据
  await showCurrentData();

  // 第一次确认
  console.log('\n\n❓ 确认 1/3: 你已经备份了数据吗？');
  const confirm1 = await question('请输入 "yes" 确认已备份: ');
  if (confirm1.toLowerCase() !== 'yes') {
    console.log('\n❌ 操作已取消。请先运行: npx tsx scripts/backup-database.ts');
    rl.close();
    process.exit(0);
  }

  // 第二次确认
  console.log('\n❓ 确认 2/3: 你确定要删除所有用户数据吗？');
  const confirm2 = await question('请输入 "DELETE ALL" 继续: ');
  if (confirm2 !== 'DELETE ALL') {
    console.log('\n❌ 操作已取消。');
    rl.close();
    process.exit(0);
  }

  // 第三次确认（随机确认码）
  const confirmCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  console.log(`\n❓ 确认 3/3: 最后确认！`);
  console.log(`请输入确认码: ${confirmCode}`);
  const confirm3 = await question('确认码: ');
  if (confirm3 !== confirmCode) {
    console.log('\n❌ 确认码错误，操作已取消。');
    rl.close();
    process.exit(0);
  }

  // 最后警告
  console.log('\n⏰ 5 秒后开始删除... (按 Ctrl+C 可取消)');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 执行删除
  await deleteAllData();

  console.log('\n\n⚠️  后续步骤:');
  console.log('1. 手动删除 Storage 文件:');
  console.log('   https://supabase.com/dashboard/project/osxwjhvlntrornibhkfu/storage/buckets');
  console.log('2. 如需恢复数据，请从备份文件中恢复');
  console.log('3. 重新部署应用后，第一个注册用户将自动获得 Free Plan\n');

  rl.close();
}

main();
