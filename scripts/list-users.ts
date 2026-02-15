/**
 * 查询所有用户及其订阅信息
 *
 * 运行方式:
 * npx tsx scripts/list-users.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 加载环境变量
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少必要的环境变量');
  console.error('需要: VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 使用 service_role key 创建管理员客户端
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'headshot_ai' },
});

async function listUsers() {
  console.log('👥 查询所有注册用户\n');
  console.log('='.repeat(80));

  try {
    // 1. 获取所有认证用户
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('❌ 查询 auth.users 失败:', authError.message);
      return;
    }

    console.log(`\n📊 总用户数: ${authUsers.users.length}\n`);

    if (authUsers.users.length === 0) {
      console.log('暂无注册用户\n');
      return;
    }

    // 2. 获取所有订阅信息
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*');

    if (subError) {
      console.warn('⚠️  查询订阅信息失败:', subError.message);
    }

    // 创建订阅映射（user_id -> subscription）
    const subMap = new Map(
      (subscriptions || []).map(sub => [sub.user_id, sub])
    );

    // 3. 遍历用户并显示详细信息
    for (let i = 0; i < authUsers.users.length; i++) {
      const user = authUsers.users[i];
      const sub = subMap.get(user.id);

      console.log(`\n${i + 1}. 用户信息`);
      console.log('─'.repeat(80));

      // 基本信息
      console.log(`📧 邮箱: ${user.email}`);
      console.log(`🆔 用户 ID: ${user.id}`);
      console.log(`👤 名称: ${user.user_metadata?.name || '未设置'}`);
      console.log(`🖼️  头像: ${user.user_metadata?.avatar_url ? '已设置' : '未设置'}`);
      console.log(`📅 注册时间: ${new Date(user.created_at).toLocaleString('zh-CN')}`);
      console.log(`📅 最后登录: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '未记录'}`);
      console.log(`🔐 认证方式: ${user.app_metadata?.provider || 'unknown'}`);

      // 订阅信息
      if (sub) {
        const totalQuota = (sub.purchased_quota || 0) + (sub.bonus_quota || 0);
        const remaining = totalQuota - (sub.used_quota || 0);

        console.log(`\n💳 订阅信息:`);
        console.log(`   套餐: ${sub.plan_type.toUpperCase()}`);
        console.log(`   状态: ${sub.status}`);
        console.log(`   配额: ${sub.used_quota}/${totalQuota} 已使用 (剩余 ${remaining})`);
        if (sub.subscribed_at) {
          console.log(`   订阅时间: ${new Date(sub.subscribed_at).toLocaleString('zh-CN')}`);
        }
      } else {
        console.log(`\n💳 订阅信息: 未创建订阅记录`);
      }
    }

    console.log('\n' + '='.repeat(80));

    // 4. 统计信息
    console.log('\n📈 统计摘要:\n');

    const planCounts = {
      free: 0,
      professional: 0,
      executive: 0,
      none: 0
    };

    authUsers.users.forEach(user => {
      const sub = subMap.get(user.id);
      if (sub) {
        planCounts[sub.plan_type as keyof typeof planCounts]++;
      } else {
        planCounts.none++;
      }
    });

    console.log(`   Free 用户: ${planCounts.free}`);
    console.log(`   Professional 用户: ${planCounts.professional}`);
    console.log(`   Executive 用户: ${planCounts.executive}`);
    console.log(`   无订阅记录: ${planCounts.none}`);

  } catch (error: any) {
    console.error('❌ 查询失败:', error.message);
  }
}

// 查询单个用户详细信息
async function getUserDetails(userId: string) {
  console.log(`\n🔍 查询用户详细信息: ${userId}\n`);
  console.log('='.repeat(80));

  try {
    // 1. 认证信息
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError) throw userError;

    console.log('\n👤 基本信息:');
    console.log(`   邮箱: ${user.user.email}`);
    console.log(`   名称: ${user.user.user_metadata?.name || '未设置'}`);
    console.log(`   注册时间: ${new Date(user.user.created_at).toLocaleString('zh-CN')}`);

    // 2. 订阅信息
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subscription) {
      const totalQuota = (subscription.purchased_quota || 0) + (subscription.bonus_quota || 0);
      const remaining = totalQuota - (subscription.used_quota || 0);

      console.log('\n💳 订阅信息:');
      console.log(`   套餐: ${subscription.plan_type.toUpperCase()}`);
      console.log(`   总配额: ${totalQuota}`);
      console.log(`   已使用: ${subscription.used_quota}`);
      console.log(`   剩余: ${remaining}`);
    }

    // 3. 生成历史
    const { data: sessions } = await supabaseAdmin
      .from('generation_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5);

    if (sessions && sessions.length > 0) {
      console.log(`\n📸 最近生成记录 (共 ${sessions.length} 条):`);
      sessions.forEach((session, i) => {
        console.log(`   ${i + 1}. ${new Date(session.date).toLocaleString('zh-CN')} - ${session.style}`);
      });
    } else {
      console.log('\n📸 生成记录: 暂无');
    }

    // 4. 支付记录
    const { data: payments } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (payments && payments.length > 0) {
      console.log(`\n💰 支付记录 (共 ${payments.length} 条):`);
      payments.forEach((payment, i) => {
        console.log(`   ${i + 1}. ${payment.plan_type.toUpperCase()} - $${payment.amount} - ${payment.status}`);
      });
    } else {
      console.log('\n💰 支付记录: 暂无');
    }

  } catch (error: any) {
    console.error('❌ 查询失败:', error.message);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0 && args[0] === '--user') {
    // 查询单个用户
    const userId = args[1];
    if (!userId) {
      console.error('❌ 请提供用户 ID: npx tsx scripts/list-users.ts --user <user-id>');
      process.exit(1);
    }
    await getUserDetails(userId);
  } else {
    // 查询所有用户
    await listUsers();
  }

  console.log('\n✅ 查询完成\n');
}

main();
