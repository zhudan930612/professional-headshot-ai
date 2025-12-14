# Creem 支付系统部署检查清单

## 📋 已完成的功能更新

### 1. 支付链接配置 ✅
- **Professional Plan**: `prod_3VuEcSLV7nUFQIFYByNkaG`
- **Executive Plan**: `prod_3goNXcJoP80L3mmWoAdkZs`
- **支付成功跳转**: 直接跳转到 `/subscription` 页面
- **Webhook URL**: `https://www.professionalheadshotai.ink/api/auth/creem/webhook`

### 2. 配额系统升级 ✅
从"每日配额"升级为"永久配额"系统：
- **免费用户**: 5 次永久配额（不再每日重置）
- **付费用户**: 购买配额永久有效，支持累加
- **配额累加**: 新购买的配额会累加到现有配额上
- **已使用次数**: 购买后保留，不会重置

### 3. 文件修改清单 ✅

#### 数据库迁移文件
- ✅ `database/migrations/004_remove_daily_quota.sql` - 新建
  - 更新 `get_user_quota_info()` 函数
  - 更新 `decrement_subscription_quota_safe()` 函数
  - 为现有用户创建免费订阅记录

#### API 文件
- ✅ `api/auth/creem/webhook.ts` - 配额累加逻辑
- ✅ `api/creem/webhook.ts` - 同步更新

#### 页面文件
- ✅ `pages/Pricing.tsx` - 更新支付链接和 return_url
- ✅ `pages/Subscription.tsx` - 移除"每日重置"文案
- ✅ `pages/Home.tsx` - 更新功能介绍文案
- ✅ `pages/Terms.tsx` - 更新使用条款
- ✅ `pages/FAQ.tsx` - 更新邮箱地址

#### 组件文件
- ✅ `components/HeroTool.tsx` - 移除 incrementQuota 调用
- ✅ `components/UpgradeModal.tsx` - 更新升级提示文案

#### 服务文件
- ✅ `services/storageService.ts` - 标记 incrementQuota 为废弃
- ✅ `lib/errorHandler.ts` - 更新错误信息

#### 配置文件
- ✅ `constants.ts` - 更新 FAQ 问题
- ✅ `App.tsx` - 移除 PaymentSuccess 路由

#### 已删除文件
- ✅ `pages/PaymentSuccess.tsx` - 已删除

## 🚀 部署步骤

### 步骤 1: 执行数据库迁移

在 Supabase SQL Editor 中依次执行以下迁移文件：

```bash
# 1. 如果还没执行过基础迁移
database/migrations/002_subscription_system.sql

# 2. 如果还没执行过配额修复
database/migrations/003_fix_quota_functions.sql

# 3. 执行新的配额系统迁移（移除每日配额）
database/migrations/004_remove_daily_quota.sql
```

### 步骤 2: 配置 Creem Dashboard

1. **添加 Webhook**
   - URL: `https://www.professionalheadshotai.ink/api/auth/creem/webhook`
   - Events: `payment.completed`, `payment.failed`, `payment.refunded`
   - 复制生成的 **Webhook Secret**

2. **获取 API Key**
   - 在 Creem Dashboard 复制 API Key（如需要）

### 步骤 3: 配置 Vercel 环境变量

在 Vercel 项目设置中添加：

```bash
CREEM_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 步骤 4: 部署代码

```bash
git add .
git commit -m "feat: 更新 Creem 支付系统，移除每日配额逻辑"
git push origin main
```

### 步骤 5: 验证功能

1. **测试免费用户**
   - 注册新账号
   - 检查是否有 5 次永久配额
   - 使用配额后检查是否正确扣减
   - 用完后检查升级提示

2. **测试支付流程**
   - 登录用户购买套餐
   - 验证 Creem 支付页面
   - 完成支付后检查是否自动跳转到 `/subscription`
   - 验证配额是否正确累加（包括之前的配额）

3. **测试配额累加**
   - 免费用户（5次，已用2次）购买 Professional（50次）
   - 预期结果：55次总配额，已用2次，剩余53次

## 🔍 功能验证清单

### 配额系统
- [ ] 新用户注册后自动获得 5 次永久配额
- [ ] 免费用户使用配额后正确扣减
- [ ] 免费用户配额用完后显示升级提示
- [ ] 购买套餐后配额正确累加
- [ ] 已使用次数正确保留

### 支付流程
- [ ] Pricing 页面显示正确的套餐信息
- [ ] 点击 Upgrade Now 跳转到 Creem 支付页面
- [ ] 支付成功后显示 "Returning to Merchant in 2s"
- [ ] 自动跳转到 `/subscription` 页面
- [ ] Webhook 成功创建订阅记录

### Webhook
- [ ] Webhook 成功接收 Creem 回调
- [ ] 签名验证通过
- [ ] 订阅记录正确创建
- [ ] 配额正确累加
- [ ] 已使用次数正确保留

### 页面文案
- [ ] 所有页面不再显示"每日"、"per day"等文案
- [ ] 免费计划显示"5 lifetime images"
- [ ] 订阅页面显示"Permanent quota"
- [ ] 升级提示显示"Quota Limit Reached"

## 📊 配额系统对比

| 方面 | 旧系统（每日配额） | 新系统（永久配额） |
|------|-------------------|-------------------|
| 免费用户 | 每天 100 次 | 永久 5 次 |
| 配额重置 | 每日 UTC 午夜 | 永不重置 |
| 购买后 | 覆盖之前配额 | 累加到现有配额 |
| 已使用 | 每日重置为 0 | 永久保留 |
| 数据表 | user_quotas | user_subscriptions |

## 🧪 测试场景

### 场景 1: 新用户注册
```
1. 用户注册 → 自动获得 5 次配额
2. 生成 2 次 → 剩余 3 次
3. 购买 Professional (50次) → 总配额 55 次，已用 2 次，剩余 53 次
```

### 场景 2: 现有免费用户
```
1. 已使用 3 次，剩余 2 次
2. 购买 Professional (50次) → 总配额 55 次，已用 3 次，剩余 52 次
```

### 场景 3: 付费用户再次购买
```
1. Professional 用户：50 次，已用 15 次
2. 再购买 Professional (50次) → 总配额 100 次，已用 15 次，剩余 85 次
```

## 📧 联系信息

- **技术支持**: support@professionalheadshotai.ink
- **Creem 支持**: support@creem.io

## ⚠️ 注意事项

1. **数据库迁移必须按顺序执行**，确保函数定义正确
2. **Webhook Secret 必须配置**，否则签名验证会失败
3. **现有用户影响**：免费用户从"每日100次"变为"总共5次"，需要提前沟通
4. **user_quotas 表保留**但不再使用，可用于历史数据分析

---

**部署日期**: 2025-12-14
**最后更新**: 2025-12-14

