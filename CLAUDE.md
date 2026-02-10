# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CLAUDE 项目工作规范
- 默认用 **简体中文** 交流和解释代码。
- 回答结构清晰,分层、有标题、有要点列表。
- 代码必须放在 ```代码块``` 中,并在下方附中文解释。
- 若内容较复杂,先给出简短总结,再展开细节。
- 如我未要求,不输出多余寒暄,专注技术与需求本身。
- 将生成的计划文件.md放到当前项目文件夹。
- 使用 React + Tailwind 风格编写组件(非 Next.js)。
- 组件必须基于现有封装,不能新建完全不相关的样式体系。

## 项目概述

这是一个专业头像 AI 生成应用,使用 React + TypeScript + Vite 构建,集成 Supabase(认证/数据库/存储)和 Nano Banana Pro AI 用于生成专业头像。

**核心技术栈:**
- React 19.2.1 + TypeScript 5.8
- Vite 6.2(构建工具)
- React Router DOM 7.10(客户端路由)
- Tailwind CSS(通过 CDN 加载)
- Supabase 2.39.0(认证/数据库/存储)
- Google Gemini AI 1.32.0(辅助内容生成)
- Lucide React 0.556.0(图标库)
- React Markdown 9.0.1(Markdown 渲染)

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器(端口 3000)
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 检查认证配置
npm run check:auth

# 检查 Supabase 连接
npm run check:supabase
```

## 环境配置

需要在 `.env.local` 文件中配置以下环境变量:

```bash
# Supabase(认证、数据库、存储)
VITE_SUPABASE_URL=https://osxwjhvlntrornibhkfu.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Nano Banana Pro AI(核心生图 API,仅 Serverless Functions 使用)
NANO_BANANA_API_KEY=your_nano_banana_api_key

# Creem 支付网关(订阅支付,仅 Serverless Functions 使用)
CREEM_API_KEY=your_creem_api_key
CREEM_SECRET_KEY=your_creem_secret_key

# Google Gemini AI(辅助内容生成,可选)
GEMINI_API_KEY=your_gemini_api_key

# 应用 URL
VITE_APP_URL=http://localhost:3000
VITE_PRODUCTION_URL=https://your-domain.vercel.app
```

**注意事项:**
- `VITE_` 前缀的变量会注入到前端代码
- 无 `VITE_` 前缀的变量仅在 Vercel Serverless Functions 中可用
- 开发服务器默认监听 `0.0.0.0:3000`

## 核心架构

### 应用入口和路由

**启动流程**:
```
index.tsx(ReactDOM.createRoot)
  ↓
App.tsx(BrowserRouter)  ← 注意:使用 BrowserRouter,非 HashRouter
  ↓
AuthProvider(全局认证和配额状态)
  ↓
Routes(9 条路由)
```

**路由定义**(`App.tsx`):
- `/`:首页 + 主工具(HeroTool)
- `/auth/callback`:OAuth 回调处理
- `/history`:生成历史记录
- `/faq`:常见问题
- `/blog`:博客列表
- `/blog/:slug`:博客详情
- `/pricing`:定价页面
- `/subscription`:订阅管理
- `/terms` & `/privacy`:条款和隐私

### 全局状态管理(AuthContext) ⭐ 核心架构

**位置**:`contexts/AuthContext.tsx`

**管理的状态**:
```typescript
{
  user: User | null,              // Supabase 用户对象
  session: Session | null,        // Supabase 会话
  loading: boolean,               // 初始化加载状态
  quotaInfo: QuotaInfo | null,    // 全局配额信息 ⭐ 重要
  isAuthModalOpen: boolean,       // 认证模态框显示状态
}
```

**核心功能**:
1. **OAuth 流程**:Google One Tap + 标准 OAuth 重定向
2. **返回路径管理**:登录后返回原始请求页面(localStorage 存储 `auth_return_path`)
3. **配额自动刷新**:登录时自动调用 `getUserQuotaInfo()` 获取订阅配额
4. **本地历史迁移**:登录时将 localStorage 历史迁移到 Supabase 数据库

**使用方式**:
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { user, quotaInfo, openAuthModal, refreshQuota } = useAuth();
```

### Supabase 集成(`lib/supabase.ts`)

**初始化**:
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**功能模块**:
- **认证**:Google OAuth + One Tap 登录
- **数据库**:Postgres + 行级安全策略(RLS)
- **存储**:S3 兼容的文件存储
  - `user-uploads`:用户上传的参考图(`{userId}/{timestamp}_reference.{ext}`)
  - `generated-headshots`:AI 生成的结果(`{userId}/{sessionId}/{imageId}.{ext}`)
- **RPC 函数**:原子操作(配额查询、配额扣减)

### 订阅系统架构 ⭐ 核心业务模型

**配额演变**:
```
旧系统(已废弃):
  ├─ 每日 100 次免费生成(午夜 UTC 重置)
  └─ 本地 localStorage 存储(`ai_headshot_quota`)

新系统(当前):
  ├─ 基于订阅的永久配额(不会自动重置)
  ├─ Free/Professional/Executive 三个套餐
  ├─ purchased_quota + bonus_quota - used_quota = remaining_quota
  └─ Supabase user_subscriptions 表存储
```

**套餐配置**:
```typescript
type SubscriptionPlan = 'free' | 'professional' | 'executive';

// Free 用户
{
  quota: 0,              // 无免费配额
  quality: '1K',         // 低质量
  has_watermark: true,   // 有水印
  // 需要升级才能生成
}

// Professional 用户
{
  quota: 50,             // 一次性 50 次
  quality: '1K',         // 标准质量
  has_watermark: false,  // 无水印
}

// Executive 用户
{
  quota: 60,             // 一次性 60 次
  bonus_quota: 10,       // 赠送 10 次
  quality: '2K',         // 高质量
  has_watermark: false,  // 无水印
}
```

**配额接口**(`types.ts`):
```typescript
interface QuotaInfo {
  plan_type: SubscriptionPlan;
  total_quota: number;       // 总配额
  used_quota: number;        // 已使用
  remaining_quota: number;   // 剩余
  is_paid: boolean;          // 是否付费用户
  quality: '1K' | '2K' | '4K'; // 图片质量
  has_watermark: boolean;    // 是否有水印
}
```

### 核心服务层

#### storageService.ts(数据持久化和配额管理)

**主要函数**:
```typescript
// 历史记录
getHistory(): Promise<GenerationSession[]>
  // 已登录:从 Supabase 查询 generation_sessions + generated_images
  // 未登录:返回空数组

saveSession(session: GenerationSession): Promise<void>
  // 保存会话到 generation_sessions 表
  // 保存图片到 generated_images 表

migrateLocalHistoryToDatabase(userId: string): Promise<void>
  // 登录时将 localStorage 历史迁移到 Supabase

// 配额系统(新)
getUserQuotaInfo(): Promise<QuotaInfo>
  // 调用 RPC 函数 get_user_quota_info()
  // 返回完整配额信息

decrementQuota(amount: number, isRetry: boolean): Promise<boolean>
  // 调用 RPC 函数 decrement_subscription_quota_safe()
  // 原子性扣减配额(防止并发超额)

getRemainingQuota(): Promise<number>
  // 获取剩余配额(基于 getUserQuotaInfo())

// 旧系统(已废弃,但代码可能仍存在)
getQuota(): UserQuota                    // 获取日配额
incrementQuota(amount: number): boolean  // 增加配额
```

#### generationService.ts(AI 生成流程协调)

**核心函数**:
```typescript
generateHeadshots(
  referenceImage: File,          // 用户上传的自拍照
  templates: HeadshotTemplate[], // 选择的背景模板
  style: HeadshotStyle,          // 风格
  userId: string,
  sessionId: string
): Promise<GeneratedImage[]>
```

**生成流程(5 步)**:
1. **检查登录状态** → 决定质量级别(1K/2K)
2. **获取配额信息** → 传递给 API 用于水印/质量判断
3. **上传参考图** → `uploadReferenceImage()` 上传到 Supabase Storage
4. **调用生成 API** → `callGenerationAPI()` 调用 Nano Banana Pro
5. **处理结果**:
   - 已登录:`downloadAndUploadGeneratedImage()` 下载并上传到 Supabase Storage
   - 未登录:直接使用临时 URL(不保存到数据库)

#### uploadService.ts(文件上传)

**Supabase Storage Buckets**:
- `user-uploads/`:用户上传的参考图
  - 路径格式:`{userId}/{timestamp}_reference.{ext}`
- `generated-headshots/`:AI 生成的结果
  - 路径格式:`{userId}/{sessionId}/{imageId}.{ext}`

**关键函数**:
```typescript
uploadReferenceImage(file: File, userId: string): Promise<string>
  // 上传参考图到 user-uploads bucket
  // 返回公开访问 URL

downloadAndUploadGeneratedImage(
  url: string,
  userId: string,
  sessionId: string
): Promise<{ url: string; storagePath: string }>
  // 下载生成的图片
  // 转换为 PNG/JPG(Canvas.toBlob)
  // 上传到 generated-headshots bucket
  // 返回 Supabase 公开 URL
```

#### subscriptionService.ts(订阅管理)

```typescript
getSubscriptionPlans(): Promise<SubscriptionPlanConfig[]>
  // 从 subscription_plans 表获取所有套餐

getUserActiveSubscription(): Promise<UserSubscription | null>
  // 获取用户当前订阅

createSubscription(
  userId: string,
  planType: SubscriptionPlan,
  paymentId: string
): Promise<void>
  // 创建新订阅记录(由 webhook 调用)
```

#### paymentService.ts(支付集成)

```typescript
createCreemPayment(planType: SubscriptionPlan): Promise<{
  orderId: string;
  paymentUrl: string;
}>
  // 调用 /api/creem/create-payment
  // 创建支付订单并返回支付链接

getPaymentStatus(orderId: string): Promise<PaymentTransaction>
  // 查询支付状态
```

#### watermarkService.ts(水印处理)

```typescript
addWatermark(imageUrl: string): Promise<Blob>
  // 使用 Canvas 在图片右下角添加水印
  // 仅 Free 用户下载时调用

downloadImageWithWatermark(url: string, filename: string): Promise<void>
  // Free 用户:addWatermark() + 下载
  // 付费用户:直接下载(无水印)
```

### 数据库设计

#### 核心表结构

**user_subscriptions**(订阅记录) ⭐ 最重要的表
```sql
id UUID PRIMARY KEY
user_id TEXT                    -- 关联 auth.users
plan_type TEXT                  -- 'free' | 'professional' | 'executive'
status TEXT                     -- 'active' | 'expired' | 'cancelled'
purchased_quota INTEGER         -- 购买的配额
bonus_quota INTEGER             -- 赠送的配额
used_quota INTEGER              -- 已使用的配额
payment_id TEXT                 -- 关联 payment_transactions
expires_at TIMESTAMP            -- 过期时间(永久订阅为 null)
subscribed_at TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```

**generation_sessions**(生成会话)
```sql
id UUID PRIMARY KEY
user_id TEXT
session_id TEXT UNIQUE
date BIGINT                     -- 时间戳
style TEXT                      -- HeadshotStyle
use_case TEXT                   -- UseCase
reference_image_url TEXT
reference_image_storage_path TEXT
created_at TIMESTAMP
```

**generated_images**(生成结果)
```sql
id UUID PRIMARY KEY
session_id TEXT                 -- FK → generation_sessions
image_id TEXT UNIQUE
url TEXT                        -- PNG URL(下载用)
jpg_url TEXT                    -- JPG URL(展示用,更好的兼容性)
storage_path TEXT
file_size INTEGER
mime_type TEXT                  -- 'image/png' | 'image/jpeg'
created_at_timestamp BIGINT
created_at TIMESTAMP
```

**uploaded_files**(参考图)
```sql
id UUID PRIMARY KEY
user_id TEXT
file_name TEXT
storage_path TEXT UNIQUE
file_size INTEGER
mime_type TEXT
uploaded_at TIMESTAMP
```

**subscription_plans**(套餐配置)
```sql
id TEXT PRIMARY KEY             -- 'free' | 'professional' | 'executive'
name TEXT
display_name TEXT
price NUMBER
quota INTEGER
bonus_quota INTEGER
quality TEXT                    -- '1K' | '2K'
has_watermark BOOLEAN
features JSONB
is_active BOOLEAN
is_popular BOOLEAN
sort_order INTEGER
created_at TIMESTAMP
updated_at TIMESTAMP
```

**payment_transactions**(支付交易)
```sql
id UUID PRIMARY KEY
user_id TEXT
subscription_id UUID            -- FK → user_subscriptions
creem_order_id TEXT
creem_transaction_id TEXT
plan_type TEXT
amount NUMBER
currency TEXT
status TEXT                     -- 'pending' | 'completed' | 'failed' | 'refunded'
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### RPC 函数(调用 Postgres 存储过程)

**get_user_quota_info**(获取配额信息)
```sql
CREATE FUNCTION get_user_quota_info(p_user_id TEXT)
RETURNS TABLE(
  plan_type TEXT,
  total_quota INTEGER,
  used_quota INTEGER,
  remaining_quota INTEGER,
  is_paid BOOLEAN,
  quality TEXT,
  has_watermark BOOLEAN
)
```

**调用方式**:
```typescript
const { data } = await supabase.rpc('get_user_quota_info', {
  p_user_id: userId
});
// 返回 QuotaInfo 对象
```

**decrement_subscription_quota_safe**(原子扣减配额)
```sql
CREATE FUNCTION decrement_subscription_quota_safe(
  p_user_id TEXT,
  p_amount INTEGER,
  p_is_retry BOOLEAN
)
RETURNS TABLE(
  success BOOLEAN,
  remaining INTEGER
)
```

**功能**:
- 原子性更新 `user_subscriptions.used_quota`
- 防止并发请求导致超额扣减
- `p_is_retry=true` 时不扣减配额(用于重新生成)

### Vercel Serverless Functions

**位置**:`/api` 目录

#### /api/nanoBanana.ts(核心生图 API)

**请求体**:
```typescript
{
  action: 'submitTask' | 'queryTask',
  referenceImageUrl: string,     // 参考图的公开 URL
  templateImageUrl: string,      // 模板背景的公开 URL
  quality: '1K' | '2K'
}
```

**流程**:
1. 校验环境变量(`NANO_BANANA_API_KEY`)
2. 构建 prompt(包含身份保护、质量参数等)
3. 调用 Nano Banana Pro API(`api.evolink.ai`)
4. 轮询任务状态直到完成(`queryTask`)
5. 返回生成的图片 URL

#### /api/creem/create-payment.ts(创建支付订单)

**请求**:
```typescript
{ planType: 'professional' | 'executive' }
```

**响应**:
```typescript
{
  orderId: string,         // Creem 订单 ID
  paymentUrl: string       // 支付链接
}
```

**流程**:
1. 从 `subscription_plans` 表获取套餐价格
2. 调用 Creem API 创建支付订单
3. 返回支付链接(前端重定向)

#### /api/creem/webhook.ts(支付回调)

**功能**:
1. 验证 Creem 签名(HMAC)
2. 更新 `payment_transactions` 表(status='completed')
3. 调用 `createSubscription()` 创建 `user_subscriptions` 记录
4. 通知前端刷新配额(可选)

#### /api/gemini.ts(可选的 Gemini 代理)

**功能**:
- 可选的后端代理,用于保护 `GEMINI_API_KEY`
- 生产环境建议使用,避免前端暴露 API Key

### 样式系统

**Tailwind CSS 配置**:
- 通过 CDN 加载(配置在 `index.html` 的 `<script>` 标签中)
- 自定义主题颜色:蓝色系(`primary.500: #3b82f6`)
- 使用 Inter 字体(Google Fonts)
- 包含自定义跑马灯动画(`animate-marquee`)

**示例配置**(`index.html`):
```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
      }
    }
  }
}
```

## 核心业务流程

### 完整"用户生成头像"流程

```
1. 用户未登录 + 点击"Create Headshots"
   ↓
   AuthContext.openAuthModal()
   ↓
   显示 Google One Tap / 标准 OAuth

2. 用户登录(Google OAuth)
   ↓
   Supabase OAuth 流程 + 回调到 /auth/callback
   ↓
   AuthCallback.tsx 处理 → 重定向回首页
   ↓
   AuthProvider 监听 onAuthStateChange
   ↓
   更新 user 和 quotaInfo

3. 用户上传参考图(3-10 张) - Step 1
   ↓
   HeroTool.tsx 保存到 files state
   ↓
   显示预览和删除按钮

4. 用户选择风格 - Step 2
   ↓
   HeroTool.tsx 保存到 selectedCategory

5. 用户选择模板 - Step 3
   ↓
   HeroTool.tsx 保存到 selectedTemplateIds(可多选)
   ↓
   显示需要的配额数量

6. 用户点击"Generate"
   ↓
   [HeroTool] 检查 remainingQuota >= selectedTemplateIds.length
   ↓
   配额不足 → 显示 InsufficientQuotaModal
   配额充足 → 继续

7. [HeroTool] 调用 generateHeadshots()
   ↓
   [generationService.ts] 处理生成逻辑

   7a. 检查用户登录状态
   7b. 获取配额信息(质量级别)
   7c. uploadReferenceImage() → 上传参考图到 Storage
   7d. callGenerationAPI() → 调用 Nano Banana API

   7d-1. 循环为每个模板调用 API:
         - toAbsoluteUrl(template) → 转换为绝对路径
         - generateHeadshotWithNanoBanana() → 调用 /api/nanoBanana
         - 传递 quality 参数(根据套餐)
         - 进度回调 → 显示生成进度

   7d-2. 如果已登录:
         - downloadAndUploadGeneratedImage()
         - 为每张图片转换和上传到 Storage
         - 获取 Supabase 公开 URL

   7d-3. 如果未登录:
         - 直接使用临时 URL
         - 不保存到数据库

8. saveSession() → 保存会话到数据库
   ↓
   generation_sessions 表 + generated_images 表

9. decrementQuota() → 扣减配额
   ↓
   调用 RPC 函数 decrement_subscription_quota_safe()
   ↓
   原子性更新 user_subscriptions.used_quota

10. [HeroTool] 在 UI 中展示生成结果
    ↓
    显示图片网格
    每张图片支持:
    - 下载(带或不带水印)
    - 单个重新生成(不扣配额, isRetry=true)

11. 用户点击"Download"
    ↓
    [watermarkService]
    - Free 用户:addWatermark() 添加水印(Canvas)
    - 付费用户:直接下载(无水印)
    ↓
    downloadImageWithWatermark() → 触发浏览器下载

12. 用户访问 History 页面
    ↓
    [storageService] getHistory()
    ↓
    从 Supabase 查询所有会话和图片
    ↓
    展示历史记录
```

### 完整"用户升级订阅"流程

```
1. 用户在 Pricing 页选择套餐
   ↓
   点击"Upgrade" → 调用 createCreemPayment(planType)

2. [paymentService] createCreemPayment()
   ↓
   调用 /api/creem/create-payment
   ↓
   [Vercel API] 与 Creem 交互
   ↓
   返回 { orderId, paymentUrl }

3. 重定向到 Creem 支付页面

4. 用户完成支付

5. Creem 回调 /api/creem/webhook.ts
   ↓
   验证签名(HMAC)
   ↓
   更新 payment_transactions 表
   ↓
   createSubscription() 创建 user_subscriptions 记录
   ↓
   Free 用户 → Professional/Executive
   ↓
   更新配额:purchased_quota + bonus_quota

6. [Frontend] 前端刷新 quotaInfo
   ↓
   AuthContext.refreshQuota()
   ↓
   调用 getUserQuotaInfo()
   ↓
   RPC 函数返回新的配额信息

7. UI 更新:
   ├─ Navbar 显示新的剩余配额
   ├─ HeroTool 显示 2K 质量
   ├─ 下载时不再添加水印
   └─ History 页显示无水印的历史图片
```

## 关键组件

### HeroTool.tsx(核心生成工具)

**三步流程**:
```
Step 1:上传参考图
  ├─ 拖放或点击上传
  ├─ 3-10 张照片
  ├─ 支持预览和删除
  └─ 检查免费用户配额

Step 2:选择风格
  ├─ HeadshotStyle(6 种风格)
  ├─ General Professional(通用)
  ├─ Medical & Healthcare
  ├─ Real Estate Agent
  ├─ Corporate & Executive
  ├─ Actor & Creative
  └─ Solid Color Background

Step 3:选择模板和生成
  ├─ 多选模板(可水平滚动)
  ├─ 实时生成进度显示
  ├─ 支持单个重新生成(不扣配额)
  ├─ 批量下载
  └─ 保存到历史记录
```

**状态管理**:
```typescript
step: 1|2|3                    // 当前步骤
files: File[]                  // 上传的文件
selectedCategory: HeadshotStyle // 选择的风格
selectedTemplateIds: string[]  // 多选的模板
selectedReferenceIndex: number // 选择的参考图
isGenerating: boolean          // 生成中
generationResults: GenerationResult[] // 逐个模板的结果
quotaInfo: QuotaInfo           // 本地 + 全局配额
```

**关键特性**:
- 智能配额检查:选择模板时预计算所需配额
- UpgradeModal:配额不足时显示升级提示
- 水印处理:Free 用户自动添加水印(Canvas)
- 重试机制:失败时支持重新生成(不扣配额)

### History.tsx(历史记录页)

**数据来源**:
```
已登录用户:
  ├─ 从 Supabase 加载(generation_sessions + generated_images)
  └─ 按日期降序排列

未登录用户:
  └─ 返回空数组(不再支持本地历史)
```

**功能**:
- 按生成日期展示会话
- 每个会话显示多张生成图片
- 支持 PNG/JPG 下载
- 支持单个重新生成
- 配额显示和升级提示

### Pricing.tsx & Subscription.tsx

**Pricing 页**:
- 展示三个订阅套餐卡片
- Popular 标记和特色功能列表
- 对比表格(配额、质量、水印等)
- CTA 按钮 → 订阅流程

**Subscription 页**:
- 用户订阅管理
- 显示当前套餐和配额使用情况
- 升级/续期按钮
- 支付历史

## 路径别名配置

- `@/*` 映射到项目根目录
- 在 `vite.config.ts` 和 `tsconfig.json` 中配置
- 示例:`import { Layout } from '@/components/Layout'`

## 关键注意事项

**模板系统**:
- `constants.ts` 中定义了 50+ 个模板
- 模板使用 JPG 图片作为预览(更好的兼容性)
- 模板 URL 支持相对路径和绝对路径(`toAbsoluteUrl()`)

**多选模板功能**:
- 用户可选择多个模板同时生成
- 每个模板生成独立的结果
- 结果展示在网格布局中,支持下载和重新生成单个结果

**图片处理**:
- 支持拖放上传和点击上传
- 最多 10 张照片,最小 3 张
- 文件预览使用 `URL.createObjectURL()`
- 记得使用 `URL.revokeObjectURL()` 清理内存

**博客系统**:
- 博客文章数据定义在 `constants.ts` 的 `BLOG_POSTS` 中
- 路由为 `/blog/:slug`(使用 SEO 友好的 slug)
- 当前为静态内容,可扩展为使用 Gemini 生成动态内容

**配额检查**:
- 所有配额检查应使用 `AuthContext.quotaInfo.remaining_quota`
- 不再使用旧的 `getQuota()` 和 `incrementQuota()` 函数
- 配额扣减使用原子操作(`decrementQuota()`)

## 部署相关

**Vercel 部署**:
- 构建输出到 `dist/` 目录
- 使用 BrowserRouter(需要配置重写规则)
- 已配置 `vercel.json` 文件

**环境变量配置**:
- 在 Vercel 项目设置中配置所有环境变量
- `VITE_` 前缀的变量会注入到前端
- 无前缀的变量仅在 Serverless Functions 中可用

**安全建议**:
- Serverless Functions 保护敏感 API Key
- 前端不直接调用 Nano Banana 或 Creem API
- 使用 Supabase RLS 策略保护数据库访问
- 使用 Creem 签名验证 webhook 请求

## 常见问题

**Q:配额不足时如何处理?**
A:显示 `InsufficientQuotaModal`,引导用户升级到 Professional 或 Executive 套餐。

**Q:重新生成时会扣减配额吗?**
A:不会。调用 `decrementQuota(amount, isRetry=true)` 时不扣减配额。

**Q:未登录用户可以生成头像吗?**
A:不可以。用户必须登录才能生成头像(Free 套餐配额为 0,需要升级)。

**Q:历史记录保存在哪里?**
A:已登录用户的历史保存在 Supabase 数据库(`generation_sessions` 和 `generated_images` 表)。

**Q:如何添加新的订阅套餐?**
A:在 `subscription_plans` 表中添加新记录,并更新前端 Pricing 页面的展示逻辑。

---

## 数据库函数开发规范 ⭐ 重要

基于实际问题的经验教训：

### ❌ 避免使用的模式

```sql
-- 不推荐：使用 RECORD 类型和 SELECT *
DECLARE
  v_subscription RECORD;
BEGIN
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = v_user_uuid;

  IF v_subscription IS NOT NULL THEN  -- 判断不可靠
    RETURN ...
  END IF;
END;
```

**问题：**
1. `SELECT *` 在表结构变更后可能失败
2. `RECORD IS NOT NULL` 判断逻辑不可靠
3. 缺少 `ORDER BY` 可能返回错误记录

### ✅ 推荐的模式

```sql
-- 推荐：明确的列选择和类型声明
DECLARE
  v_plan_type TEXT;
  v_purchased_quota INT;
  v_used_quota INT;
BEGIN
  SELECT plan_type, purchased_quota, used_quota
  INTO v_plan_type, v_purchased_quota, v_used_quota
  FROM user_subscriptions
  WHERE user_id = v_user_uuid
    AND status = 'active'
  ORDER BY created_at DESC  -- 明确排序规则
  LIMIT 1;

  IF v_plan_type IS NOT NULL THEN  -- 检查具体字段
    RETURN ...
  END IF;
END;
```

### 数据库迁移最佳实践

1. **所有迁移脚本按顺序编号**：`001_`, `002_`, `003_`
2. **避免创建多个 fix-xxx.sql 脚本**，应合并为统一的迁移脚本
3. **每次部署后立即测试 RPC 函数**：
   ```sql
   -- 验证函数存在
   SELECT proname, pg_get_function_arguments(oid)
   FROM pg_proc
   WHERE proname = 'your_function_name';

   -- 测试返回值
   SELECT * FROM your_function_name('test-id');

   -- 验证数据一致性
   SELECT
     (SELECT result FROM your_function_name(user_id::text))
       = (expected_calculation) as is_consistent
   FROM your_table
   LIMIT 10;
   ```

4. **使用事务确保原子性**：
   ```sql
   BEGIN;
   -- 迁移脚本内容
   COMMIT;
   ```

### 调试技巧

添加 `RAISE NOTICE` 日志（开发/调试时）：
```sql
CREATE OR REPLACE FUNCTION debug_function(p_user_id TEXT)
RETURNS JSONB
AS $$
DECLARE
  v_found BOOLEAN := false;
BEGIN
  RAISE NOTICE 'Function called with: %', p_user_id;

  SELECT true INTO v_found
  FROM table_name
  WHERE user_id = p_user_id::uuid;

  RAISE NOTICE 'Record found: %', v_found;

  -- 其余逻辑
END;
$$;
```

在 Supabase Dashboard → Logs → Postgres Logs 中查看日志输出。
