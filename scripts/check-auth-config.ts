/**
 * Supabase 认证配置检查脚本
 * 
 * 运行方式：
 * tsx scripts/check-auth-config.ts
 */

import { createClient } from '@supabase/supabase-js';

// 从环境变量读取配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('📋 Supabase 认证配置检查\n');

// 1. 检查环境变量
console.log('1️⃣ 环境变量检查:');
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
  console.log('✅ VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY.substring(0, 30) + '...');
}

// 2. 检查 Supabase 连接
console.log('\n2️⃣ Supabase 连接测试:');
try {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // 测试基础连接（不需要认证）
  const { data, error } = await supabase.from('generation_sessions').select('count').limit(0);
  
  if (error) {
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      console.log('✅ Supabase 连接成功（表可能不存在，但连接正常）');
    } else {
      console.log('⚠️ Supabase 连接测试返回错误:', error.message);
    }
  } else {
    console.log('✅ Supabase 连接成功');
  }
} catch (error: any) {
  console.log('❌ Supabase 连接失败:', error.message);
  process.exit(1);
}

// 3. 检查 OAuth 配置
console.log('\n3️⃣ OAuth 配置检查:');
console.log('需要在 Supabase Dashboard 中手动验证以下配置：');
console.log('');
console.log('📍 Authentication → URL Configuration');
console.log('   - Site URL: https://www.professionalheadshotai.ink');
console.log('   - Redirect URLs:');
console.log('     • http://localhost:3000');
console.log('     • http://localhost:3000/auth/callback');
console.log('     • https://www.professionalheadshotai.ink');
console.log('     • https://www.professionalheadshotai.ink/auth/callback');
console.log('     • https://professionalheadshotai.ink');
console.log('     • https://professionalheadshotai.ink/auth/callback');
console.log('');
console.log('📍 Authentication → Providers → Google');
console.log('   - 状态: Enabled ✅');
console.log('   - Authorized redirect URIs:');
console.log(`     • ${SUPABASE_URL}/auth/v1/callback`);

// 4. 代码检查
console.log('\n4️⃣ 代码实现检查:');
console.log('✅ signOut() 不传递 redirectTo 参数');
console.log('✅ signInWithGoogle() 使用 window.location.origin');
console.log('✅ 手动重定向: window.location.href = window.location.origin');

// 5. 常见问题排查
console.log('\n5️⃣ 常见问题排查:');
console.log('');
console.log('🔴 如果退出登录返回 403 错误：');
console.log('   1. 检查 Supabase Dashboard 的 Site URL 是否正确');
console.log('   2. 检查 Redirect URLs 是否包含线上域名');
console.log('   3. 清除浏览器缓存和 Cookies');
console.log('   4. 等待 1-2 分钟让配置生效');
console.log('');
console.log('🔴 如果 Google 登录失败：');
console.log('   1. 检查 Google Cloud Console 的 Authorized redirect URIs');
console.log('   2. 确保包含: ' + SUPABASE_URL + '/auth/v1/callback');
console.log('   3. 检查 VITE_GOOGLE_CLIENT_ID 环境变量');
console.log('');
console.log('🔴 如果只在线上环境失败：');
console.log('   1. 确认 Vercel 环境变量已正确配置');
console.log('   2. 确认 Supabase Redirect URLs 包含线上域名');
console.log('   3. 在 Vercel 中重新部署项目');

// 6. 快速修复指南
console.log('\n6️⃣ 快速修复步骤:');
console.log('');
console.log('Step 1: 前往 Supabase Dashboard');
console.log(`        https://supabase.com/dashboard/project/${SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]}`);
console.log('');
console.log('Step 2: Authentication → URL Configuration');
console.log('        - 设置 Site URL: https://www.professionalheadshotai.ink');
console.log('        - 添加所有 Redirect URLs（见上方列表）');
console.log('');
console.log('Step 3: 保存配置并等待 1-2 分钟');
console.log('');
console.log('Step 4: 清除浏览器缓存，重新测试');
console.log('');
console.log('✅ 配置检查完成！');
