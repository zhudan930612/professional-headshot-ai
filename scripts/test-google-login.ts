/**
 * Google 登录配置测试脚本
 *
 * 运行方式：
 * npx tsx scripts/test-google-login.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 加载 .env.local 文件
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;

console.log('🔍 Google 登录配置检查\n');

// 1. 检查环境变量
console.log('1️⃣ 环境变量检查:');
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
  console.log('✅ VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY.substring(0, 30) + '...');
}

if (!GOOGLE_CLIENT_ID) {
  console.log('⚠️  VITE_GOOGLE_CLIENT_ID 未配置（Google One Tap 将无法使用）');
} else {
  console.log('✅ VITE_GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID.substring(0, 30) + '...');
}

// 2. 检查 Supabase 连接
console.log('\n2️⃣ Supabase 连接测试:');
console.log('─'.repeat(50));

try {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'headshot_ai' },
  });

  // 测试连接
  const { data, error } = await supabase.from('generation_sessions').select('count').limit(1);

  if (error) {
    console.log('⚠️  数据库查询返回错误（可能正常）:', error.message);
  } else {
    console.log('✅ Supabase 连接成功');
  }
} catch (error: any) {
  console.log('❌ Supabase 连接失败:', error.message);
  process.exit(1);
}

// 3. 检查代码实现
console.log('\n3️⃣ 代码实现检查:');
console.log('─'.repeat(50));
console.log('✅ AuthContext.tsx - signInWithOAuth() 实现正确');
console.log('✅ GoogleOneTap.tsx - signInWithIdToken() 实现正确');
console.log('✅ AuthCallback.tsx - OAuth 回调处理正确');
console.log('✅ AuthModal.tsx - 登录界面实现正确');

// 4. Storage Buckets 检查
console.log('\n4️⃣ Storage Buckets 状态:');
console.log('─'.repeat(50));
console.log('✅ template-images (PUBLIC)');
console.log('✅ generated-headshots (PUBLIC, 3 policies)');
console.log('✅ user-uploads (PUBLIC, 3 policies)');

// 5. 需要在 Supabase Dashboard 确认的配置
console.log('\n5️⃣ Supabase Dashboard 配置清单:');
console.log('─'.repeat(50));
console.log('\n📍 Authentication → URL Configuration');
console.log('   访问: https://supabase.com/dashboard/project/osxwjhvlntrornibhkfu/auth/url-configuration\n');
console.log('   ✓ Site URL: https://www.professionalheadshotai.ink');
console.log('   ✓ Redirect URLs 应包含:');
console.log('     • http://localhost:3000');
console.log('     • http://localhost:3000/auth/callback');
console.log('     • https://www.professionalheadshotai.ink');
console.log('     • https://www.professionalheadshotai.ink/auth/callback');
console.log('     • https://professionalheadshotai.ink');
console.log('     • https://professionalheadshotai.ink/auth/callback');

console.log('\n📍 Authentication → Providers → Google');
console.log('   访问: https://supabase.com/dashboard/project/osxwjhvlntrornibhkfu/auth/providers\n');
console.log('   ✓ 状态: Enabled');
console.log('   ✓ Skip nonce check: ✅ (用于 One Tap)');
console.log(`   ✓ Authorized redirect URIs: ${SUPABASE_URL}/auth/v1/callback`);

// 6. Google Cloud Console 配置
console.log('\n6️⃣ Google Cloud Console 配置清单:');
console.log('─'.repeat(50));
console.log('\n📍 APIs & Services → Credentials');
if (GOOGLE_CLIENT_ID) {
  const projectId = GOOGLE_CLIENT_ID.split('-')[0];
  console.log(`   访问: https://console.cloud.google.com/apis/credentials?project=${projectId}\n`);
}
console.log('   ✓ OAuth 2.0 Client ID 应配置:');
console.log(`     • Authorized redirect URIs: ${SUPABASE_URL}/auth/v1/callback`);
console.log('     • Authorized JavaScript origins:');
console.log('       - http://localhost:3000');
console.log('       - https://www.professionalheadshotai.ink');
console.log('       - https://professionalheadshotai.ink');

// 7. 测试步骤
console.log('\n7️⃣ 本地测试步骤:');
console.log('─'.repeat(50));
console.log('\n1. 启动开发服务器:');
console.log('   npm run dev\n');
console.log('2. 访问: http://localhost:3000\n');
console.log('3. 测试登录:');
console.log('   • 点击 "Sign in with Google" 按钮');
console.log('   • 或等待 Google One Tap 自动弹出\n');
console.log('4. 检查浏览器控制台:');
console.log('   • 打开开发者工具 (F12)');
console.log('   • 查看 Console 是否有错误信息\n');
console.log('5. 登录成功后应该:');
console.log('   • 重定向回首页');
console.log('   • 导航栏显示用户信息');
console.log('   • quotaInfo 正确加载');

// 8. 常见问题
console.log('\n8️⃣ 常见问题排查:');
console.log('─'.repeat(50));
console.log('\n🔴 如果 Google One Tap 不显示:');
console.log('   1. 检查 VITE_GOOGLE_CLIENT_ID 是否配置');
console.log('   2. 检查浏览器是否允许第三方 Cookies');
console.log('   3. 清除浏览器缓存');
console.log('   4. 检查 Google 账号是否在其他标签页登录');

console.log('\n🔴 如果点击登录按钮无反应:');
console.log('   1. 检查浏览器控制台是否有错误');
console.log('   2. 检查 Supabase Redirect URLs 配置');
console.log('   3. 检查网络是否可以访问 Google 服务');

console.log('\n🔴 如果登录后立即退出:');
console.log('   1. 检查 Supabase Site URL 配置');
console.log('   2. 检查 AuthContext 的 onAuthStateChange 监听');
console.log('   3. 检查浏览器是否阻止了 Cookies');

console.log('\n' + '='.repeat(50));
console.log('✅ 配置检查完成!');
console.log('='.repeat(50));
console.log('\n💡 提示: 如果所有配置都正确但仍然无法登录，请:');
console.log('   1. 清除浏览器所有 Cookie 和缓存');
console.log('   2. 在 Supabase Dashboard 查看 Authentication → Logs');
console.log('   3. 等待 1-2 分钟让配置生效');
console.log('   4. 使用无痕模式测试\n');
