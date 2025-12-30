# 数据库架构说明

## 📊 表结构总览

项目使用 **Supabase (PostgreSQL)** 作为数据库，共有以下核心表：

```
数据流向图:
用户登录 → user_subscriptions (订阅信息)
                ↓
          配额管理 (RPC 函数)
                ↓
上传照片 → uploaded_files (参考图)
                ↓
生成头像 → generation_sessions (会话)
                ↓
          generated_images (生成结果)
                ↓
          扣减配额 (user_subscriptions.used_quota++)
```

---

## 1️⃣ user_subscriptions（订阅记录）⭐ 最核心的表

### 作用
存储每个用户的**订阅信息和配额状态**，这是整个应用的核心业务表。

### 表结构
```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,                    -- 关联 Supabase auth.users.id
  plan_type TEXT NOT NULL,                  -- 'free' | 'professional' | 'executive'
  status TEXT NOT NULL,                     -- 'active' | 'expired' | 'cancelled'
  purchased_quota INTEGER DEFAULT 0,        -- 购买的配额数量
  bonus_quota INTEGER DEFAULT 0,            -- 赠送的配额数量
  used_quota INTEGER DEFAULT 0,             -- 已使用的配额
  payment_id TEXT,                          -- 关联 payment_transactions.id
  expires_at TIMESTAMP WITH TIME ZONE,      -- 过期时间（永久订阅为 NULL）
  subscribed_at TIMESTAMP WITH TIME ZONE,   -- 订阅时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_payment FOREIGN KEY (payment_id)
    REFERENCES payment_transactions(creem_order_id)
);

-- 索引
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
```

### 配额计算逻辑
```typescript
total_quota = purchased_quota + bonus_quota
remaining_quota = total_quota - used_quota

// 示例
Professional 用户:
  purchased_quota: 50
  bonus_quota: 0
  used_quota: 12
  → remaining_quota: 38

Executive 用户:
  purchased_quota: 60
  bonus_quota: 10
  used_quota: 5
  → remaining_quota: 65
```

### 数据示例
```sql
-- Free 用户（新注册用户）
{
  user_id: 'user_123',
  plan_type: 'free',
  status: 'active',
  purchased_quota: 0,
  bonus_quota: 0,
  used_quota: 0,
  expires_at: NULL
}

-- Professional 用户（已付费）
{
  user_id: 'user_456',
  plan_type: 'professional',
  status: 'active',
  purchased_quota: 50,
  bonus_quota: 0,
  used_quota: 12,
  payment_id: 'payment_789',
  expires_at: NULL  -- 永久有效
}
```

### 关键 RPC 函数
```sql
-- 获取配额信息
get_user_quota_info(p_user_id TEXT)
  → 返回 QuotaInfo (包含 remaining_quota)

-- 原子扣减配额（防止并发超额）
decrement_subscription_quota_safe(
  p_user_id TEXT,
  p_amount INTEGER,
  p_is_retry BOOLEAN
) → 返回 (success BOOLEAN, remaining INTEGER)
```

---

## 2️⃣ generation_sessions（生成会话）

### 作用
记录每次用户生成头像的**会话信息**，一个会话可以包含多张生成的图片。

### 表结构
```sql
CREATE TABLE generation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,                    -- 关联 auth.users.id
  session_id TEXT UNIQUE NOT NULL,          -- 前端生成的会话 ID (UUID)
  date BIGINT NOT NULL,                     -- 生成时间戳 (毫秒)
  style TEXT,                               -- 风格类型（如 'General Professional'）
  use_case TEXT,                            -- 使用场景（已废弃，可能为 NULL）
  reference_image_url TEXT,                 -- 参考图的公开 URL
  reference_image_storage_path TEXT,        -- 参考图在 Storage 的路径
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_user FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_generation_sessions_user_id ON generation_sessions(user_id);
CREATE INDEX idx_generation_sessions_session_id ON generation_sessions(session_id);
CREATE INDEX idx_generation_sessions_date ON generation_sessions(date DESC);
```

### 数据示例
```sql
{
  id: 'uuid-1',
  user_id: 'user_123',
  session_id: 'session_abc123',
  date: 1735574400000,  -- 2024-12-30 12:00:00
  style: 'General Professional',
  reference_image_url: 'https://supabase.co/storage/.../reference.jpg',
  reference_image_storage_path: 'user_123/1735574400_reference.jpg',
  created_at: '2024-12-30 12:00:00'
}
```

### 关联关系
```
generation_sessions (1) ←→ (N) generated_images
  一个会话 → 多张生成的图片
```

---

## 3️⃣ generated_images（生成的图片）

### 作用
存储每张 AI 生成的头像图片信息，包括 URL、存储路径、文件大小等。

### 表结构
```sql
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,                 -- 关联 generation_sessions.session_id
  image_id TEXT UNIQUE NOT NULL,            -- 图片唯一标识 (UUID)
  url TEXT NOT NULL,                        -- PNG 图片 URL（下载用）
  jpg_url TEXT,                             -- JPG 图片 URL（展示用）
  storage_path TEXT NOT NULL,               -- Storage 中的路径
  file_size INTEGER,                        -- 文件大小（字节）
  mime_type TEXT,                           -- 'image/png' | 'image/jpeg'
  created_at_timestamp BIGINT,              -- 创建时间戳（毫秒）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_session FOREIGN KEY (session_id)
    REFERENCES generation_sessions(session_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_generated_images_session_id ON generated_images(session_id);
CREATE INDEX idx_generated_images_image_id ON generated_images(image_id);
CREATE INDEX idx_generated_images_created_at ON generated_images(created_at DESC);
```

### 数据示例
```sql
{
  id: 'uuid-2',
  session_id: 'session_abc123',
  image_id: 'img_xyz789',
  url: 'https://supabase.co/storage/.../img_xyz789.png',
  jpg_url: 'https://supabase.co/storage/.../img_xyz789.jpg',
  storage_path: 'user_123/session_abc123/img_xyz789.png',
  file_size: 524288,  -- 512KB
  mime_type: 'image/png',
  created_at_timestamp: 1735574460000,
  created_at: '2024-12-30 12:01:00'
}
```

### 为什么同时有 PNG 和 JPG？
```
PNG (url):
  - 高质量，无损压缩
  - 用于下载
  - 支持透明背景（未来可能需要）

JPG (jpg_url):
  - 文件更小，加载更快
  - 用于网页展示
  - 更好的浏览器兼容性
```

---

## 4️⃣ uploaded_files（用户上传的参考图）

### 作用
记录用户上传的**参考照片**（自拍照），用于 AI 生成头像的输入。

### 表结构
```sql
CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,                    -- 关联 auth.users.id
  file_name TEXT NOT NULL,                  -- 原始文件名
  storage_path TEXT UNIQUE NOT NULL,        -- Storage 中的路径
  file_size INTEGER,                        -- 文件大小（字节）
  mime_type TEXT,                           -- 'image/jpeg' | 'image/png' 等
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_user FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_uploaded_at ON uploaded_files(uploaded_at DESC);
```

### 数据示例
```sql
{
  id: 'uuid-3',
  user_id: 'user_123',
  file_name: 'my-selfie.jpg',
  storage_path: 'user_123/1735574400_reference.jpg',
  file_size: 1048576,  -- 1MB
  mime_type: 'image/jpeg',
  uploaded_at: '2024-12-30 12:00:00'
}
```

### Storage Bucket 路径规则
```
user-uploads/
  ├─ user_123/
  │   ├─ 1735574400_reference.jpg
  │   ├─ 1735574500_reference.png
  │   └─ ...
  └─ user_456/
      └─ ...

格式: {user_id}/{timestamp}_reference.{ext}
```

---

## 5️⃣ subscription_plans（订阅套餐配置）

### 作用
存储所有可用的**订阅套餐**信息，包括价格、配额、功能等。

### 表结构
```sql
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,                      -- 'free' | 'professional' | 'executive'
  name TEXT NOT NULL,                       -- 套餐内部名称
  display_name TEXT NOT NULL,               -- 显示名称（如 'Professional Plan'）
  price NUMERIC(10, 2) NOT NULL,            -- 价格（美元）
  quota INTEGER NOT NULL,                   -- 基础配额数量
  bonus_quota INTEGER DEFAULT 0,            -- 赠送配额
  quality TEXT NOT NULL,                    -- '1K' | '2K'
  has_watermark BOOLEAN NOT NULL,           -- 是否有水印
  features JSONB,                           -- 功能列表（JSON 数组）
  is_active BOOLEAN DEFAULT TRUE,           -- 是否启用
  is_popular BOOLEAN DEFAULT FALSE,         -- 是否标记为"热门"
  sort_order INTEGER DEFAULT 0,             -- 显示顺序
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 数据示例
```sql
-- Free Plan
{
  id: 'free',
  name: 'Free',
  display_name: 'Free Plan',
  price: 0.00,
  quota: 0,
  bonus_quota: 0,
  quality: '1K',
  has_watermark: true,
  features: [
    "0 free headshots",
    "1K quality (low resolution)",
    "Watermarked images",
    "Basic styles"
  ],
  is_active: true,
  is_popular: false,
  sort_order: 1
}

-- Professional Plan
{
  id: 'professional',
  name: 'Professional',
  display_name: 'Professional Plan',
  price: 9.99,
  quota: 50,
  bonus_quota: 0,
  quality: '2K',
  has_watermark: false,
  features: [
    "50 professional headshots",
    "2K quality (high resolution)",
    "No watermark",
    "All styles & templates",
    "Priority support"
  ],
  is_active: true,
  is_popular: true,
  sort_order: 2
}

-- Executive Plan
{
  id: 'executive',
  name: 'Executive',
  display_name: 'Executive Plan',
  price: 19.99,
  quota: 60,
  bonus_quota: 10,
  quality: '2K',
  has_watermark: false,
  features: [
    "60 + 10 bonus headshots (total 70)",
    "2K quality (high resolution)",
    "No watermark",
    "All styles & templates",
    "Priority support",
    "Advanced editing options"
  ],
  is_active: true,
  is_popular: false,
  sort_order: 3
}
```

---

## 6️⃣ payment_transactions（支付交易记录）

### 作用
记录所有**支付交易**，包括 Creem 支付网关的订单信息。

### 表结构
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,                    -- 关联 auth.users.id
  subscription_id UUID,                     -- 关联 user_subscriptions.id
  creem_order_id TEXT UNIQUE NOT NULL,      -- Creem 支付订单 ID
  creem_transaction_id TEXT,                -- Creem 交易 ID
  plan_type TEXT NOT NULL,                  -- 'professional' | 'executive'
  amount NUMERIC(10, 2) NOT NULL,           -- 支付金额
  currency TEXT DEFAULT 'USD',              -- 货币类型
  status TEXT NOT NULL,                     -- 'pending' | 'completed' | 'failed' | 'refunded'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_user FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscription FOREIGN KEY (subscription_id)
    REFERENCES user_subscriptions(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_creem_order_id ON payment_transactions(creem_order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
```

### 数据示例
```sql
-- 待支付
{
  id: 'uuid-4',
  user_id: 'user_123',
  subscription_id: NULL,
  creem_order_id: 'creem_order_abc123',
  creem_transaction_id: NULL,
  plan_type: 'professional',
  amount: 9.99,
  currency: 'USD',
  status: 'pending',
  created_at: '2024-12-30 12:00:00'
}

-- 支付完成
{
  id: 'uuid-4',
  user_id: 'user_123',
  subscription_id: 'uuid-5',
  creem_order_id: 'creem_order_abc123',
  creem_transaction_id: 'creem_tx_xyz789',
  plan_type: 'professional',
  amount: 9.99,
  currency: 'USD',
  status: 'completed',
  created_at: '2024-12-30 12:00:00',
  updated_at: '2024-12-30 12:05:00'
}
```

### 支付流程
```
1. 用户点击 "Upgrade" → createCreemPayment()
   ↓
2. 创建 payment_transaction (status: 'pending')
   ↓
3. 重定向到 Creem 支付页面
   ↓
4. 用户完成支付
   ↓
5. Creem webhook → /api/creem/webhook.ts
   ↓
6. 更新 payment_transaction (status: 'completed')
   ↓
7. 创建 user_subscription (plan_type: 'professional')
   ↓
8. 配额生效
```

---

## 7️⃣ user_quotas（旧配额系统）⚠️ 已废弃

### 作用
**旧的每日配额系统**，已被 `user_subscriptions` 表取代。

### 为什么废弃？
```
旧系统问题:
- 每日 100 次免费配额（午夜 UTC 重置）
- 存储在 localStorage，不可靠
- 无法实现订阅付费模式

新系统优势:
- 永久配额（不会重置）
- 基于订阅的商业模式
- 服务端验证，更安全
```

### 迁移策略
```typescript
// 代码中可能仍有引用，但不再使用
// 保留是为了兼容性，避免报错
export const getQuota = (): UserQuota => {
  console.warn('getQuota() is deprecated');
  return { remaining: 0, max: 0, resetAt: Date.now() };
};
```

---

## 🔄 完整业务流程示例

### 用户生成头像的数据流

```
1️⃣ 用户登录
   → auth.users (Supabase Auth)
   → 检查 user_subscriptions
   → 如果不存在，创建 Free Plan 记录

2️⃣ 上传参考图
   → uploaded_files 表插入记录
   → Storage: user-uploads/{user_id}/{timestamp}_reference.jpg

3️⃣ 选择模板并生成
   → 检查 user_subscriptions.remaining_quota
   → 如果配额不足 → 显示升级提示
   → 如果配额充足 → 继续

4️⃣ 调用 AI API
   → generation_sessions 表插入会话记录
   → Nano Banana Pro API 生成图片

5️⃣ 保存生成结果
   → generated_images 表插入图片记录
   → Storage: generated-headshots/{user_id}/{session_id}/{image_id}.png

6️⃣ 扣减配额
   → RPC: decrement_subscription_quota_safe()
   → user_subscriptions.used_quota += 1
   → 原子操作，防止并发超额

7️⃣ 显示结果
   → 从 generated_images 读取 URL
   → 展示给用户（付费用户无水印，免费用户有水印）
```

---

## 🗃️ Storage Buckets

除了数据库表，还有 3 个 Storage Buckets：

```
1. user-uploads (Public)
   - 用户上传的参考图
   - 路径: {user_id}/{timestamp}_reference.{ext}
   - RLS 策略: 只有所有者可以上传和查看

2. generated-headshots (Public)
   - AI 生成的头像图片
   - 路径: {user_id}/{session_id}/{image_id}.{ext}
   - RLS 策略: 只有所有者可以查看

3. template-images (Public)
   - 背景模板图片（静态资源）
   - 路径: templates/{template_name}.jpg
   - RLS 策略: 所有人可以读取
```

---

## 📋 RLS（行级安全）策略

Supabase 使用 Row Level Security 保护数据：

```sql
-- generation_sessions: 只能访问自己的会话
CREATE POLICY "Users can only see their own sessions"
ON generation_sessions
FOR SELECT
USING (auth.uid()::text = user_id);

-- generated_images: 只能访问自己的图片
CREATE POLICY "Users can only see their own images"
ON generated_images
FOR SELECT
USING (
  session_id IN (
    SELECT session_id FROM generation_sessions
    WHERE user_id = auth.uid()::text
  )
);

-- user_subscriptions: 只能访问自己的订阅
CREATE POLICY "Users can only see their own subscription"
ON user_subscriptions
FOR SELECT
USING (auth.uid()::text = user_id);
```

---

## 🔍 常用查询示例

### 查询用户配额
```sql
SELECT * FROM get_user_quota_info('user_123');
-- 返回: {plan_type, total_quota, used_quota, remaining_quota, ...}
```

### 查询用户历史记录
```sql
SELECT
  gs.session_id,
  gs.date,
  gs.style,
  gs.reference_image_url,
  gi.url,
  gi.jpg_url,
  gi.created_at
FROM generation_sessions gs
JOIN generated_images gi ON gs.session_id = gi.session_id
WHERE gs.user_id = 'user_123'
ORDER BY gs.date DESC;
```

### 查询用户订阅状态
```sql
SELECT
  plan_type,
  status,
  purchased_quota + bonus_quota AS total_quota,
  used_quota,
  (purchased_quota + bonus_quota - used_quota) AS remaining_quota,
  subscribed_at
FROM user_subscriptions
WHERE user_id = 'user_123' AND status = 'active';
```

### 查询支付记录
```sql
SELECT
  pt.creem_order_id,
  pt.plan_type,
  pt.amount,
  pt.status,
  pt.created_at,
  us.purchased_quota
FROM payment_transactions pt
LEFT JOIN user_subscriptions us ON pt.subscription_id = us.id
WHERE pt.user_id = 'user_123'
ORDER BY pt.created_at DESC;
```

---

## 📊 表关系图

```
auth.users (Supabase Auth)
    ↓
    ├─→ user_subscriptions (1:N)
    │       ↓
    │       └─→ payment_transactions (1:N)
    │
    ├─→ uploaded_files (1:N)
    │
    └─→ generation_sessions (1:N)
            ↓
            └─→ generated_images (1:N)

subscription_plans (配置表，独立)
```

---

## ✅ 总结

| 表名 | 主要作用 | 是否核心 | 备注 |
|------|---------|---------|------|
| **user_subscriptions** | 订阅和配额管理 | ⭐⭐⭐ | 最核心 |
| **generation_sessions** | 生成会话记录 | ⭐⭐⭐ | 核心业务 |
| **generated_images** | 生成的图片 | ⭐⭐⭐ | 核心业务 |
| **uploaded_files** | 用户上传的参考图 | ⭐⭐ | 重要 |
| **subscription_plans** | 套餐配置 | ⭐⭐ | 配置表 |
| **payment_transactions** | 支付记录 | ⭐⭐ | 财务相关 |
| **user_quotas** | 旧配额系统 | ❌ | 已废弃 |

