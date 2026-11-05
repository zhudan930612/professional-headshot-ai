# 清理 Public Schema 业务表

> 恢复上线阶段不要执行本文清理 SQL。先阅读 HANDOFF.MD 并验证所有功能、RPC 归属及备份；本文不是本轮恢复的必要步骤。

> 迁移到 `headshot_ai` schema 后，清理 `public` schema 下的业务表

## 前置条件

1. 确认应用已完全迁移到 `headshot_ai` schema
2. 已完整测试所有功能（登录、生成、历史、支付）
3. 验证脚本通过：`npx tsx scripts/verify-schema-migration.ts`

---

## 1. 备份数据（可选但推荐）

```sql
-- 备份 public schema 下的业务表数据
CREATE TABLE public.user_subscriptions_backup AS SELECT * FROM public.user_subscriptions;
CREATE TABLE public.generation_sessions_backup AS SELECT * FROM public.generation_sessions;
CREATE TABLE public.generated_images_backup AS SELECT * FROM public.generated_images;
CREATE TABLE public.payment_transactions_backup AS SELECT * FROM public.payment_transactions;
CREATE TABLE public.subscription_plans_backup AS SELECT * FROM public.subscription_plans;
CREATE TABLE public.uploaded_files_backup AS SELECT * FROM public.uploaded_files;
CREATE TABLE public.products_backup AS SELECT * FROM public.products;
```

---

## 2. 删除 Public Schema 业务表

```sql
-- 删除 headshot_ai 业务相关的视图（已迁移到 headshot_ai schema）
DROP VIEW IF EXISTS public.generation_sessions;
DROP VIEW IF EXISTS public.generated_images;
DROP VIEW IF EXISTS public.payment_transactions;
DROP VIEW IF EXISTS public.user_subscriptions;
DROP VIEW IF EXISTS public.subscription_plans;
DROP VIEW IF EXISTS public.uploaded_files;

-- 删除 products 表（无用，各产品通过硬编码指定 schema）
DROP TABLE IF EXISTS public.products;
```

---

## 3. 删除备份表（确认无误后）

```sql
-- 确认 headshot_ai schema 运行正常后，删除备份
DROP TABLE IF EXISTS public.user_subscriptions_backup;
DROP TABLE IF EXISTS public.generation_sessions_backup;
DROP TABLE IF EXISTS public.generated_images_backup;
DROP TABLE IF EXISTS public.payment_transactions_backup;
DROP TABLE IF EXISTS public.subscription_plans_backup;
DROP TABLE IF EXISTS public.uploaded_files_backup;
DROP TABLE IF EXISTS public.products_backup;
```

---

## 4. 验证清理结果

```sql
-- 查看 public schema 剩余的表（应该只有 Supabase 系统表）
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## 注意事项

- **不要删除 `public` schema 本身**，Supabase 系统功能依赖它
- 如果有 RPC 函数在 `public` schema 下引用这些表，需要先删除或迁移函数
- Storage buckets (`user-uploads`, `generated-headshots`) 不受影响，无需处理
