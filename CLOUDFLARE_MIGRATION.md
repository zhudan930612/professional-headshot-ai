# Cloudflare Pages 迁移指南

## 概述

本项目已从 Vercel 迁移到 Cloudflare Pages + Functions。本文档记录了所有迁移变更和部署步骤。

## 迁移变更

### 1. API 函数迁移

**原路径**：`/api/*`（Vercel Serverless Functions）  
**新路径**：`/functions/api/*`（Cloudflare Pages Functions）

#### 迁移的文件：

| 原文件 | 新文件 | 说明 |
|--------|--------|------|
| `api/nanoBanana.ts` | `functions/api/nanoBanana.ts` | AI 图片生成 API |
| `api/gemini.ts` | `functions/api/gemini.ts` | Gemini AI 内容生成 |
| `api/creem/create-payment.ts` | `functions/api/creem/create-payment.ts` | 创建支付订单 |
| `api/creem/webhook.ts` | `functions/api/creem/webhook.ts` | 支付回调处理 |

#### 代码变更：

1. **移除 Vercel 特定类型**
   ```typescript
   // 旧代码
   import type { VercelRequest, VercelResponse } from '@vercel/node';
   export default async function handler(req: VercelRequest, res: VercelResponse) { }
   
   // 新代码
   export async function onRequestPost(context: { request: Request; env: Env }) {
     return new Response(...)
   }
   ```

2. **环境变量访问**
   ```typescript
   // 旧代码
   const apiKey = process.env.NANO_BANANA_API_KEY;
   
   // 新代码
   const apiKey = context.env.NANO_BANANA_API_KEY;
   ```

3. **请求/响应处理**
   ```typescript
   // 旧代码
   res.status(200).json({ data });
   
   // 新代码
   return new Response(JSON.stringify({ data }), {
     status: 200,
     headers: { 'Content-Type': 'application/json' }
   });
   ```

4. **HMAC 签名验证（Web Crypto API）**
   ```typescript
   // 旧代码（Node.js）
   import crypto from 'crypto';
   const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
   
   // 新代码（Web Crypto API）
   const key = await crypto.subtle.importKey(
     'raw',
     new TextEncoder().encode(secret),
     { name: 'HMAC', hash: 'SHA-256' },
     false,
     ['sign']
   );
   const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
   const hashHex = Array.from(new Uint8Array(signatureBuffer))
     .map(b => b.toString(16).padStart(2, '0'))
     .join('');
   ```

### 2. 配置文件

#### 新增文件：

- **`public/_redirects`**：SPA 路由回退配置
  ```
  /api/* 200
  /* /index.html 200
  ```

- **`wrangler.toml`**：Cloudflare Pages 配置
  ```toml
  name = "professional-headshot-ai"
  compatibility_date = "2024-01-01"
  pages_build_output_dir = "dist"
  ```

- **`.nvmrc`**：Node 版本锁定（v20）

#### 保持不变：

- `vite.config.ts`
- `tsconfig.json`
- `package.json`
- `.env.local`（需要在 Cloudflare Dashboard 重新配置）

### 3. 数据库

**无需迁移**，继续使用 Supabase。

## 部署步骤

### 前置准备

1. **确保本地构建成功**
   ```bash
   npm run build
   ```

2. **验证所有环境变量**（`.env.local.example` 作为参考）

### Cloudflare Pages 部署

#### 方式 1：通过 Cloudflare Dashboard（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. 选择仓库和分支（`main`）
4. 配置构建设置：
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
   - **Root directory**：（留空）
5. 点击 **Save and Deploy**

#### 方式 2：通过 Wrangler CLI

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署（首次）
wrangler pages deploy dist --project-name=professional-headshot-ai

# 后续部署
npm run build
wrangler pages deploy dist
```

### 环境变量配置

在 Cloudflare Pages 项目设置中添加以下环境变量：

#### 前端变量（`VITE_` 前缀）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbG...` |
| `VITE_APP_URL` | 应用 URL（开发） | `http://localhost:3000` |
| `VITE_PRODUCTION_URL` | 应用 URL（生产） | `https://xxx.pages.dev` |

#### 后端变量（仅 Functions 可见）

| 变量名 | 说明 |
|--------|------|
| `NANO_BANANA_API_KEY` | Nano Banana AI API Key |
| `CREEM_API_KEY` | Creem 支付 API Key |
| `CREEM_SECRET_KEY` | Creem 密钥 |
| `CREEM_WEBHOOK_SECRET` | Creem Webhook 签名密钥 |
| `GEMINI_API_KEY` | Google Gemini AI API Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 |

### 域名绑定

1. **在 Cloudflare Pages 设置中添加自定义域名**
2. **更新环境变量**：
   - `VITE_PRODUCTION_URL` 改为新域名
   - `VITE_APP_URL` 保持 `http://localhost:3000`
3. **更新 Supabase OAuth 回调 URL**：
   - Supabase Dashboard → Authentication → URL Configuration
   - 添加：`https://your-domain.com/auth/callback`

### Creem Webhook 配置

更新 Creem Dashboard 中的 Webhook URL：
```
https://your-domain.com/api/creem/webhook
```

## 验证清单

### A. 构建与部署

- [ ] 本地 `npm run build` 成功
- [ ] Cloudflare Pages 构建成功
- [ ] 所有环境变量已配置

### B. API Functions 验证

- [ ] `/api/nanoBanana` 能正常生成并返回图片 URL
- [ ] `/api/creem/create-payment` 返回 `orderId` + `paymentUrl`
- [ ] `/api/creem/webhook` 验证签名通过，并更新订阅记录
- [ ] `/api/gemini` 能正常生成内容

### C. 路由与 SPA 回退

- [ ] `/`、`/pricing`、`/history` 直接访问不 404
- [ ] 刷新任意前端路由不 404
- [ ] `/api/*` 请求不会被前端路由拦截

### D. 核心流程验证

- [ ] 登录（Google OAuth）可用
- [ ] 生成流程完整跑通
- [ ] 下载（带/不带水印）逻辑正常
- [ ] 配额扣减/刷新正常
- [ ] 订阅升级成功并生效

### E. 生产监控

- [ ] Cloudflare Functions 日志无高频错误
- [ ] 前端加载与生成速度可接受
- [ ] Supabase 连接正常

## 回滚方案

如遇问题，可快速回滚到 Vercel：

1. **保留 Vercel 原部署**（不要删除）
2. **DNS 切回 Vercel**（如果已更换域名）
3. **Supabase OAuth 回调恢复旧 URL**

## 性能对比

| 指标 | Vercel | Cloudflare Pages |
|------|--------|------------------|
| 全球边缘节点 | ✅ | ✅ |
| 冷启动时间 | ~200ms | ~100ms |
| Functions 执行限制 | 10s（Hobby） | 30s（Free） |
| 构建速度 | 快 | 较快 |
| 免费带宽 | 100GB/月 | 无限 |

## 技术支持

### 日志查看

- **Cloudflare Dashboard** → **Workers & Pages** → 选择项目 → **Functions** → **Logs**
- **Supabase Dashboard** → **Logs** → **Postgres Logs**

### 常见问题

#### 1. Functions 调用失败（500 错误）

**原因**：环境变量未配置或 API Key 错误  
**解决**：检查 Cloudflare Pages 环境变量设置

#### 2. CORS 错误

**原因**：CORS headers 未正确设置  
**解决**：已在 Functions 中添加 CORS 头，检查 `onRequestOptions` 函数

#### 3. 签名验证失败（Webhook）

**原因**：`CREEM_WEBHOOK_SECRET` 配置错误  
**解决**：确认环境变量与 Creem Dashboard 一致

#### 4. Supabase 连接失败

**原因**：`SUPABASE_SERVICE_ROLE_KEY` 缺失  
**解决**：从 Supabase Dashboard → Settings → API 复制 `service_role` 密钥

## 后续优化

- [ ] 启用 Cloudflare Analytics
- [ ] 配置 Cloudflare WAF 规则
- [ ] 启用 DDoS 保护
- [ ] 优化 Functions 缓存策略
- [ ] 添加 Cloudflare Workers KV（如需缓存）

## 相关文档

- [Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
