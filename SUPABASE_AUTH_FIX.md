# Supabase 认证问题修复指南

## 🚨 问题症状

- ✅ 本地开发环境：登录/退出正常
- ❌ 线上环境：**无法退出登录**，控制台显示 `403 Forbidden` 和 `Sign out error`

## 🔍 问题根源

Supabase 项目的 **Site URL** 和 **Redirect URLs** 配置不正确，导致线上域名的认证请求被拒绝。

## ✅ 解决方案

### 步骤 1: 登录 Supabase Dashboard

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目：`osxwjhvlntrornibhkfu`（Professional Headshot AI）

### 步骤 2: 配置 Authentication URLs

进入 **Authentication** → **URL Configuration**：

#### 2.1 Site URL（重要！）
```
https://www.professionalheadshotai.ink
```

**说明**：这是你的生产环境主域名，Supabase 会验证所有认证请求是否来自这个域名。

#### 2.2 Redirect URLs（允许列表）
添加以下所有 URL（每行一个）：

```
http://localhost:3000
http://localhost:3000/auth/callback
https://www.professionalheadshotai.ink
https://www.professionalheadshotai.ink/auth/callback
https://professionalheadshotai.ink
https://professionalheadshotai.ink/auth/callback
```

**说明**：
- 包含本地开发环境（`localhost:3000`）
- 包含生产环境（带和不带 `www`）
- 包含 OAuth 回调路径（`/auth/callback`）

### 步骤 3: 配置 Google OAuth Provider

进入 **Authentication** → **Providers** → **Google**：

#### 3.1 Authorized redirect URIs
确保包含：
```
https://osxwjhvlntrornibhkfu.supabase.co/auth/v1/callback
```

#### 3.2 在 Google Cloud Console 中配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com)
2. 进入 **APIs & Services** → **Credentials**
3. 选择你的 OAuth 2.0 Client ID
4. 在 **Authorized redirect URIs** 中添加：
   ```
   https://osxwjhvlntrornibhkfu.supabase.co/auth/v1/callback
   ```

### 步骤 4: 保存并等待生效

1. 点击 **Save** 保存所有更改
2. 等待 1-2 分钟让配置生效
3. **清除浏览器缓存和 Cookies**
4. 重新测试登录/退出功能

## 🧪 验证步骤

### 本地测试
```bash
# 1. 启动开发服务器
pnpm dev

# 2. 访问 http://localhost:3000
# 3. 测试登录 → 退出流程
```

### 线上测试
```bash
# 1. 部署到 Vercel
git push origin main

# 2. 访问 https://www.professionalheadshotai.ink
# 3. 测试登录 → 退出流程
# 4. 检查浏览器控制台是否还有 403 错误
```

## 📋 完整配置检查清单

### Supabase Dashboard
- [ ] **Site URL**: `https://www.professionalheadshotai.ink`
- [ ] **Redirect URLs** 包含所有必需的 URL（见上方列表）
- [ ] **Google Provider** 已启用且配置正确

### Google Cloud Console
- [ ] OAuth Client ID 的 **Authorized redirect URIs** 包含 Supabase 回调 URL

### 代码检查
- [ ] `contexts/AuthContext.tsx` 中的 `signOut()` **没有传递** `redirectTo` 参数
- [ ] `signInWithGoogle()` 使用 `window.location.origin` 而非硬编码 URL
- [ ] `lib/supabase.ts` 使用正确的环境变量（`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`）

### Vercel 环境变量
- [ ] `VITE_SUPABASE_URL` = `https://osxwjhvlntrornibhkfu.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（正确的 Anon Key）
- [ ] `VITE_GOOGLE_CLIENT_ID` = 你的 Google Client ID

## 🔧 当前代码已经正确

### ✅ `contexts/AuthContext.tsx` - `signOut()` 函数

```typescript
const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
  // ✅ 不传递 redirectTo，让前端自己处理重定向
};
```

### ✅ `components/Layout.tsx` - `handleSignOut()` 函数

```typescript
const handleSignOut = async () => {
  setIsUserMenuOpen(false);
  // 清除所有用户数据
  localStorage.removeItem('ai_headshot_history');
  localStorage.removeItem('ai_headshot_quota');
  localStorage.removeItem('ai_headshot_user_id');
  localStorage.removeItem('auth_return_path');
  sessionStorage.clear();

  try {
    await signOut();
  } catch (error) {
    console.error('登出失败:', error);
  }

  // ✅ 手动重定向到首页
  window.location.href = window.location.origin;
};
```

### ✅ `contexts/AuthContext.tsx` - `signInWithGoogle()` 函数

```typescript
const signInWithGoogle = async (returnTo?: string) => {
  // 保存返回路径
  if (returnTo && typeof returnTo === 'string') {
    localStorage.setItem(RETURN_PATH_KEY, returnTo);
  }

  // ✅ 使用动态 origin，不依赖环境变量
  const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
  if (returnTo && typeof returnTo === 'string') {
    callbackUrl.searchParams.set('returnTo', returnTo);
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    console.error('Google login error:', error);
    throw error;
  }
};
```

## 🎯 核心原则

1. **不要硬编码域名**
   - ✅ 使用 `window.location.origin`
   - ❌ 不要使用 `VITE_APP_URL` 环境变量

2. **signOut() 不传递 redirectTo**
   - ✅ `await supabase.auth.signOut()`
   - ❌ `await supabase.auth.signOut({ redirectTo: '/' })`

3. **Supabase Dashboard 配置是关键**
   - 必须在 **Redirect URLs** 中添加所有允许的域名
   - **Site URL** 必须是生产环境的主域名

## 📞 仍然有问题？

### 1. 检查浏览器控制台

打开浏览器开发者工具（F12）→ Console，查看详细错误信息：

```
Sign out error: { message: "...", status: 403 }
```

### 2. 检查 Supabase Logs

在 Supabase Dashboard → **Logs** → **Auth Logs** 中查看认证请求的详细日志。

### 3. 清除所有缓存

```bash
# 清除浏览器缓存和 Cookies
# 或使用隐身模式测试
```

### 4. 验证环境变量

在浏览器控制台运行：

```javascript
// 检查 Supabase 配置
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Current Origin:', window.location.origin);
```

确保 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 正确配置。

---

**最后更新**: 2025-12-14
**Supabase 项目**: osxwjhvlntrornibhkfu
**生产域名**: https://www.professionalheadshotai.ink
