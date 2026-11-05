/**
 * 验证 headshot_ai schema 迁移是否成功
 *
 * 运行: npx tsx scripts/verify-schema-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

// 使用 headshot_ai schema 的 client
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'headshot_ai' }
});

// 使用 public schema 的 client（对比用）
const supabasePublic = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
});

async function verify() {
  console.log('=== 验证 headshot_ai schema 迁移 ===\n');

  // 1. 测试 subscription_plans 表
  console.log('1. 检查 subscription_plans 表...');
  const { data: plans, error: plansError } = await supabase
    .from('subscription_plans')
    .select('id, name, price')
    .limit(5);

  if (plansError) {
    console.log('   ❌ 失败:', plansError.message);
  } else {
    console.log('   ✅ 成功，找到', plans?.length || 0, '个套餐');
    plans?.forEach(p => console.log(`      - ${p.id}: ${p.name} ($${p.price})`));
  }

  // 2. 测试 user_subscriptions 表
  console.log('\n2. 检查 user_subscriptions 表...');
  const { data: subs, error: subsError } = await supabase
    .from('user_subscriptions')
    .select('id, plan_type, status')
    .limit(3);

  if (subsError) {
    console.log('   ❌ 失败:', subsError.message);
  } else {
    console.log('   ✅ 成功，找到', subs?.length || 0, '条订阅记录');
  }

  // 3. 测试 generation_sessions 表
  console.log('\n3. 检查 generation_sessions 表...');
  const { data: sessions, error: sessionsError } = await supabase
    .from('generation_sessions')
    .select('id, session_id')
    .limit(3);

  if (sessionsError) {
    console.log('   ❌ 失败:', sessionsError.message);
  } else {
    console.log('   ✅ 成功，找到', sessions?.length || 0, '条会话记录');
  }

  // 4. 测试 RPC 函数（需要有效用户ID）
  console.log('\n4. 检查 RPC 函数 get_user_quota_info...');
  const { data: quotaData, error: quotaError } = await supabase
    .rpc('get_user_quota_info', { p_user_id: 'test-user-id' });

  if (quotaError) {
    if (quotaError.message.includes('function') || quotaError.code === '42883') {
      console.log('   ⚠️  RPC 函数可能不存在或未迁移到 headshot_ai schema');
      console.log('   需要在 Supabase 中创建/更新 RPC 函数');
    } else {
      console.log('   ✅ RPC 函数存在（返回空数据是正常的，因为测试用户不存在）');
    }
  } else {
    console.log('   ✅ RPC 函数正常工作');
  }

  // 5. 对比 public 和 headshot_ai
  console.log('\n5. 对比 public 和 headshot_ai schema...');
  const { count: publicCount } = await supabasePublic
    .from('subscription_plans')
    .select('*', { count: 'exact', head: true });
  const { count: headshotCount } = await supabase
    .from('subscription_plans')
    .select('*', { count: 'exact', head: true });

  console.log(`   public.subscription_plans: ${publicCount ?? '无法访问'} 条`);
  console.log(`   headshot_ai.subscription_plans: ${headshotCount ?? '无法访问'} 条`);

  console.log('\n=== 验证完成 ===');
}

verify().catch(console.error);
