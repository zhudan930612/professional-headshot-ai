# Vercel 环境变量配置指南

## ⚠️ 重要提示

**这是一个 Vite 项目，不是 Next.js！**

- ✅ 前端环境变量必须使用 `VITE_` 前缀（不是 `NEXT_PUBLIC_`）
- ✅ Vercel 需要特殊配置才能注入 `VITE_*` 环境变量到构建中

## 📋 从 Creem Dashboard 截图确认的信息

### Webhook 配置
- **Webhook URL**: `https://www.professionalheadshotai.ink/api/auth/creem/webhook` ✅
- **状态**: Enabled ✅
- **Signing Secret**: `whsec_4R7zfH1u7jmfyD9n7nAtq`

### 启用的事件
以下事件已在 Creem Dashboard 中启用：
- `subscription.active` - 订阅激活
- `subscription.trialing` - 试用期
- `subscription.canceled` - 订阅取消
- `subscription.scheduled_cancel` - 计划取消
- `subscription.paid` - 订阅支付完成
- `subscription.expired` - 订阅过期
- `subscription.unpaid` - 订阅未支付
- `subscription.update` - 订阅更新
- `subscription.past_due` - 逾期未付
- `subscription.paused` - 订阅暂停
- `refund.created` - 退款创建
- `dispute.created` - 争议创建

## 🔐 必需的环境变量

在 Vercel 项目设置中配置以下环境变量：

### 1. Creem Webhook Secret
```bash
CREEM_WEBHOOK_SECRET=whsec_4R7zfH1u7jmfyD9n7nAtq
```
**说明**: 用于验证 Creem webhook 请求的签名，防止伪造请求

### 2. Supabase URL (Public)
```bash
VITE_SUPABASE_URL=https://osxwjhvlntrornibhkfu.supabase.co
```
**说明**: Supabase 项目的公开 URL（⚠️ 必须用 `VITE_` 前缀）

### 3. Supabase Service Role Key (Private)
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**说明**: 
- ⚠️ **绝对机密**，拥有完全数据库访问权限
- 仅在服务端使用（Serverless Functions）
- 在 Supabase Dashboard → Settings → API → `service_role` key 获取

### 4. Supabase Anon Key (Public)
```bash
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**说明**: 前端使用的公开 Key，受 Row Level Security 保护（⚠️ 必须用 `VITE_` 前缀）

### 5. Google OAuth (可选)
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 📝 Vercel 配置步骤

### 方法 1: 通过 Vercel Dashboard

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 选择项目 `professional-headshot-ai`
3. 进入 **Settings** → **Environment Variables**
4. 逐个添加以上环境变量：
   - **Key**: 变量名（如 `CREEM_WEBHOOK_SECRET`）
   - **Value**: 变量值（从 Creem/Supabase 获取）
   - **Environments**: 选择 `Production`, `Preview`, `Development`（根据需要）
5. 点击 **Save**
6. 重新部署项目以应用新的环境变量

### 方法 2: 通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 添加环境变量
vercel env add CREEM_WEBHOOK_SECRET
# 输入值: whsec_4R7zfH1u7jmfyD9n7nAtq
# 选择环境: Production

vercel env add SUPABASE_SERVICE_ROLE_KEY
# 输入值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# 选择环境: Production

# 查看所有环境变量
vercel env ls
```

## 🔍 环境变量验证

### 本地开发验证

创建 `.env.local` 文件（不要提交到 Git）：
```bash
# Creem (Serverless Functions)
CREEM_WEBHOOK_SECRET=whsec_4R7zfH1u7jmfyD9n7nAtq
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase (Frontend - ⚠️ 必须用 VITE_ 前缀)
VITE_SUPABASE_URL=https://osxwjhvlntrornibhkfu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google (可选)
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

### 生产环境验证

部署后测试 Webhook：
```bash
# 在 Creem Dashboard 中点击 "Send test event"
# 检查 Vercel Function Logs
```

## 🚨 安全最佳实践

1. **绝不在代码中硬编码密钥**
   ```typescript
   // ❌ 错误
   const secret = 'whsec_4R7zfH1u7jmfyD9n7nAtq';
   
   // ✅ 正确
   const secret = process.env.CREEM_WEBHOOK_SECRET;
   ```

2. **区分公开和私有环境变量**
   - `NEXT_PUBLIC_*` 前缀：可在浏览器访问（公开）
   - 无前缀：仅在服务端访问（私有）

3. **定期轮换密钥**
   - 建议每 90 天轮换一次 Service Role Key
   - 在 Creem 中轮换 Webhook Secret

4. **最小权限原则**
   - 前端仅使用 Anon Key
   - Service Role Key 仅用于 Serverless Functions

## 📊 环境变量使用位置

| 环境变量 | 使用位置 | 访问权限 |
|---------|---------|---------|
| `CREEM_WEBHOOK_SECRET` | `api/auth/creem/webhook.ts` | 服务端 |
| `VITE_SUPABASE_URL` | 前端（编译时注入） | 公开 |
| `VITE_SUPABASE_ANON_KEY` | 前端（编译时注入） | 公开 |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/auth/creem/webhook.ts` | 服务端 |

## 🧪 测试 Webhook

### 1. 使用 Creem 测试功能
在 Creem Dashboard 的 Webhook 页面点击 **"Send test event"**

### 2. 查看 Vercel Logs
```bash
# 实时查看 Function 日志
vercel logs --follow

# 或在 Vercel Dashboard → Deployments → 选择部署 → Functions
```

### 3. 验证签名
成功的请求会在日志中显示：
```
✅ Creem 签名验证成功
📊 配额累加: 之前 5+0, 新增 50+0, 已使用 2
✅ 订阅创建成功: xxx
```

失败的请求会显示：
```
❌ Creem 签名验证失败
```

## 🔄 更新环境变量后

1. **触发重新部署**
   ```bash
   git commit --allow-empty -m "trigger redeploy"
   git push origin main
   ```

2. **或在 Vercel Dashboard 手动重新部署**
   - Deployments → 最新部署 → 三点菜单 → Redeploy

## 📞 故障排查

### Webhook 签名验证失败
- 检查 `CREEM_WEBHOOK_SECRET` 是否正确
- 确认在 Vercel 中配置了该变量
- 重新部署以应用新的环境变量

### Supabase 连接失败
- 检查 `SUPABASE_SERVICE_ROLE_KEY` 是否正确
- 确认 Supabase 项目未暂停
- 检查 RLS 策略是否正确配置

### 环境变量未生效
- 确认变量名拼写正确（区分大小写）
- 确认选择了正确的环境（Production/Preview/Development）
- 重新部署项目

---

**配置日期**: 2025-12-14
**Webhook Secret**: `whsec_4R7zfH1u7jmfyD9n7nAtq`
**Webhook URL**: `https://www.professionalheadshotai.ink/api/auth/creem/webhook`

