/**
 * 删除指定用户的所有数据
 *
 * 用途: 删除用户及其所有关联数据（订阅、生成记录、上传文件等）
 *
 * 运行方式:
 * npx tsx scripts/delete-user.ts <email>
 *
 * 示例:
 * npx tsx scripts/delete-user.ts zhudan930612@gmail.com
 */

import { config } from 'dotenv';
import { createClient, type User } from '@supabase/supabase-js';
import * as readline from 'readline';

// 加载环境变量
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少必要的环境变量');
  console.error('需要: VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 使用 service_role key 创建管理员客户端（可以绕过 RLS）
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'headshot_ai' },
});

// 创建命令行交互
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

// 查询用户信息
async function getUserInfo(email: string) {
  console.log(`\n🔍 查询用户: ${email}\n`);
  console.log('='.repeat(80));

  try {
    // 1. 从 auth.users 查询用户
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) throw authError;

    const user = authData.users.find((u: User) => u.email === email);

    if (!user) {
      console.log(`❌ 未找到用户: ${email}`);
      return null;
    }

    console.log(`\n✅ 找到用户:`);
    console.log(`   邮箱: ${user.email}`);
    console.log(`   用户 ID: ${user.id}`);
    console.log(`   名称: ${user.user_metadata?.name || '未设置'}`);
    console.log(`   注册时间: ${new Date(user.created_at).toLocaleString('zh-CN')}`);
    console.log(`   最后登录: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '未记录'}`);

    // 2. 查询订阅信息
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (subError) console.warn('⚠️  查询订阅失败:', subError.message);

    // 3. 查询生成会话
    const { data: sessions, error: sessError } = await supabaseAdmin
      .from('generation_sessions')
      .select('*')
      .eq('user_id', user.id);

    if (sessError) console.warn('⚠️  查询会话失败:', sessError.message);

    // 4. 查询生成图片
    const { data: images, error: imgError } = await supabaseAdmin
      .from('generated_images')
      .select('*')
      .in('session_id', sessions?.map(s => s.session_id) || []);

    if (imgError && sessions && sessions.length > 0) {
      console.warn('⚠️  查询图片失败:', imgError.message);
    }

    // 5. 查询上传文件
    const { data: uploads, error: uploadError } = await supabaseAdmin
      .from('uploaded_files')
      .select('*')
      .eq('user_id', user.id);

    if (uploadError) console.warn('⚠️  查询上传文件失败:', uploadError.message);

    // 6. 查询支付记录
    const { data: payments, error: payError } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('user_id', user.id);

    if (payError) console.warn('⚠️  查询支付记录失败:', payError.message);

    // 显示数据统计
    console.log(`\n📊 关联数据统计:`);
    console.log('─'.repeat(80));
    console.log(`   订阅记录: ${subscriptions?.length || 0} 条`);
    console.log(`   生成会话: ${sessions?.length || 0} 条`);
    console.log(`   生成图片: ${images?.length || 0} 张`);
    console.log(`   上传文件: ${uploads?.length || 0} 个`);
    console.log(`   支付记录: ${payments?.length || 0} 条`);

    // 显示订阅详情
    if (subscriptions && subscriptions.length > 0) {
      console.log(`\n💳 订阅详情:`);
      subscriptions.forEach((sub, i) => {
        const totalQuota = (sub.purchased_quota || 0) + (sub.bonus_quota || 0);
        console.log(`   ${i + 1}. ${sub.plan_type.toUpperCase()} - ${sub.status}`);
        console.log(`      配额: ${sub.used_quota}/${totalQuota} 已使用`);
        if (sub.subscribed_at) {
          console.log(`      订阅时间: ${new Date(sub.subscribed_at).toLocaleString('zh-CN')}`);
        }
      });
    }

    return {
      user,
      subscriptions: subscriptions || [],
      sessions: sessions || [],
      images: images || [],
      uploads: uploads || [],
      payments: payments || []
    };

  } catch (error: any) {
    console.error('❌ 查询失败:', error.message);
    return null;
  }
}

// 删除用户数据
async function deleteUserData(userId: string) {
  console.log(`\n🔥 开始删除用户数据...\n`);
  console.log('='.repeat(80));

  try {
    // 1. 删除生成图片
    console.log('\n1️⃣ 删除生成图片 (generated_images)...');
    const { data: sessions } = await supabaseAdmin
      .from('generation_sessions')
      .select('session_id')
      .eq('user_id', userId);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.session_id);
      const { error: imgError } = await supabaseAdmin
        .from('generated_images')
        .delete()
        .in('session_id', sessionIds);

      if (imgError) throw new Error(`删除图片失败: ${imgError.message}`);
      console.log('   ✅ 已删除所有生成图片');
    } else {
      console.log('   ℹ️  无生成图片需要删除');
    }

    // 2. 删除生成会话
    console.log('\n2️⃣ 删除生成会话 (generation_sessions)...');
    const { error: sessError } = await supabaseAdmin
      .from('generation_sessions')
      .delete()
      .eq('user_id', userId);

    if (sessError) throw new Error(`删除会话失败: ${sessError.message}`);
    console.log('   ✅ 已删除所有生成会话');

    // 3. 删除上传文件
    console.log('\n3️⃣ 删除上传文件 (uploaded_files)...');
    const { error: uploadError } = await supabaseAdmin
      .from('uploaded_files')
      .delete()
      .eq('user_id', userId);

    if (uploadError) throw new Error(`删除上传文件失败: ${uploadError.message}`);
    console.log('   ✅ 已删除所有上传文件记录');

    // 4. 删除支付记录
    console.log('\n4️⃣ 删除支付记录 (payment_transactions)...');
    const { error: payError } = await supabaseAdmin
      .from('payment_transactions')
      .delete()
      .eq('user_id', userId);

    if (payError) throw new Error(`删除支付记录失败: ${payError.message}`);
    console.log('   ✅ 已删除所有支付记录');

    // 5. 删除订阅记录
    console.log('\n5️⃣ 删除订阅记录 (user_subscriptions)...');
    const { error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subError) throw new Error(`删除订阅失败: ${subError.message}`);
    console.log('   ✅ 已删除所有订阅记录');

    // 6. 删除认证用户
    console.log('\n6️⃣ 删除认证用户 (auth.users)...');
    const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (userError) throw new Error(`删除用户失败: ${userError.message}`);
    console.log('   ✅ 已删除用户认证记录');

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ 用户数据已全部删除！');

    console.log('\n⚠️  注意:');
    console.log('   • Storage 中的文件需要手动删除');
    console.log('   • 访问: https://supabase.com/dashboard/project/osxwjhvlntrornibhkfu/storage/buckets');
    console.log(`   • 删除 user-uploads/${userId}/ 和 generated-headshots/${userId}/ 文件夹`);

  } catch (error: any) {
    console.error('\n❌ 删除失败:', error.message);
    throw error;
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('\n❌ 请提供用户邮箱');
    console.error('\n用法: npx tsx scripts/delete-user.ts <email>');
    console.error('示例: npx tsx scripts/delete-user.ts zhudan930612@gmail.com\n');
    process.exit(1);
  }

  const email = args[0];

  console.log('\n' + '⚠️ '.repeat(40));
  console.log('\n🚨 删除用户数据 - 警告');
  console.log('\n此操作将永久删除用户的所有数据，包括：');
  console.log('  • 用户认证记录');
  console.log('  • 订阅和配额信息');
  console.log('  • 所有生成的头像');
  console.log('  • 所有上传的参考图');
  console.log('  • 所有支付记录');
  console.log('\n数据删除后无法恢复！');
  console.log('\n' + '⚠️ '.repeat(40));

  // 1. 查询用户信息
  const userInfo = await getUserInfo(email);

  if (!userInfo) {
    rl.close();
    process.exit(1);
  }

  // 2. 确认删除
  console.log('\n\n❓ 确认 1/2: 你确定要删除这个用户的所有数据吗？');
  const confirm1 = await question('请输入 "yes" 确认: ');

  if (confirm1.toLowerCase() !== 'yes') {
    console.log('\n❌ 操作已取消。');
    rl.close();
    process.exit(0);
  }

  // 3. 二次确认（输入用户 ID）
  console.log(`\n❓ 确认 2/2: 请输入用户 ID 的前 8 位以确认:`);
  console.log(`用户 ID: ${userInfo.user.id}`);
  const userIdPrefix = userInfo.user.id.substring(0, 8);
  const confirm2 = await question(`请输入: ${userIdPrefix}\n确认: `);

  if (confirm2 !== userIdPrefix) {
    console.log('\n❌ 用户 ID 不匹配，操作已取消。');
    rl.close();
    process.exit(0);
  }

  // 4. 执行删除
  console.log('\n⏰ 3 秒后开始删除... (按 Ctrl+C 可取消)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  await deleteUserData(userInfo.user.id);

  console.log('\n\n🎯 后续步骤:');
  console.log('1. 手动删除 Storage 文件（见上方提示）');
  console.log('2. 尝试用同一邮箱重新登录');
  console.log('3. 验证是否触发新用户注册流程');
  console.log('4. 检查是否自动创建 Free Plan 订阅\n');

  rl.close();
}

main().catch((error) => {
  console.error('\n❌ 执行失败:', error);
  rl.close();
  process.exit(1);
});
