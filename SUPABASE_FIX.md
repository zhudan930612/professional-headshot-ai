# Supabase RLS 策略修复指南

## 问题描述

当前应用遇到以下错误:

```
❌ Error: new row violates row-level security policy
❌ Error fetching quota from Supabase: Object
❌ StorageApiError: new row violates row-level security policy
```

**根本原因**: Supabase 的数据库表和 Storage buckets 启用了 **行级安全策略(RLS)**,但没有定义任何访问规则,导致所有操作被拒绝。

---

## 修复步骤

### 步骤 1: 登录 Supabase Dashboard

1. 打开浏览器,访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 登录你的账号
3. 选择项目: `osxwjhvlntrornibhkfu` (你的 `.env.local` 中的项目)

---

### 步骤 2: 创建 Storage Buckets

1. 在左侧菜单选择 **Storage**
2. 点击 **New bucket** 创建以下两个 bucket:

   **Bucket 1: user-uploads**
   - Name: `user-uploads`
   - Public: ✅ **开启** (用户上传的参考图)
   - File size limit: 10MB
   - Allowed MIME types: `image/jpeg, image/png, image/webp, image/heic`

   **Bucket 2: generated-headshots**
   - Name: `generated-headshots`
   - Public: ✅ **开启** (AI 生成的头像)
   - File size limit: 10MB
   - Allowed MIME types: `image/jpeg, image/png`

---

### 步骤 3: 执行 RLS 策略 SQL

1. 在左侧菜单选择 **SQL Editor**
2. 点击 **+ New query**
3. 打开项目文件 `database/rls-policies.sql`
4. **复制所有内容** 并粘贴到 SQL Editor
5. 点击 **Run** 按钮执行

> **注意**: 如果遇到 "policy already exists" 错误,说明策略已部分创建,可以忽略或先删除旧策略:
> ```sql
> DROP POLICY IF EXISTS "Users can view own quota" ON user_quotas;
> -- 然后重新运行 rls-policies.sql
> ```

---

### 步骤 4: 验证配置

#### 4.1 验证 Storage Buckets

1. 进入 **Storage** > **user-uploads**
2. 点击 **Policies** 标签
3. 应该看到以下策略:
   - ✅ Users can upload own files
   - ✅ Users can view own uploads
   - ✅ Users can delete own uploads

4. 重复上述步骤检查 **generated-headshots** bucket

#### 4.2 验证数据库表策略

1. 进入 **Table Editor**
2. 选择表 `user_quotas`
3. 点击右上角 **齿轮图标** > **Edit Table** > **Policies**
4. 应该看到:
   - ✅ Users can view own quota
   - ✅ Users can insert own quota
   - ✅ Users can update own quota

5. 重复检查 `generation_sessions`, `generated_images`, `uploaded_files` 表

---

### 步骤 5: 测试应用

1. 回到浏览器,刷新应用页面 (http://localhost:3000)
2. 上传 3-10 张照片
3. 选择风格模板
4. 点击 **Generate** 生成头像

**预期结果**:
- ✅ 照片上传成功 (无 RLS 错误)
- ✅ 配额显示正常 (无 "Error fetching quota" 错误)
- ✅ 图片生成成功

---

## 常见问题

### Q1: 执行 SQL 时提示 "permission denied"

**解决方案**: 确保你是项目的 **Owner** 或 **Admin** 角色。如果不是,请联系项目管理员执行 SQL。

### Q2: Storage 上传仍然失败,提示 "Bucket not found"

**解决方案**:
1. 检查 bucket 名称是否完全匹配:
   - `user-uploads` (不是 user_uploads)
   - `generated-images` (不是 generated_images)
2. 确保 bucket 设置为 **Public**
3. 在 **Storage Settings** > **Policies** 中手动添加策略

### Q3: 匿名用户无法上传

**解决方案**: 当前策略同时支持:
- **已认证用户**: `user_id = auth.uid()::text`
- **匿名用户**: `user_id LIKE 'anon_%'`

如果只想允许已登录用户,可以修改策略移除 `OR user_id LIKE 'anon_%'` 部分。

### Q4: 如何查看当前生效的策略?

在 **SQL Editor** 运行:

```sql
-- 查看数据库表策略
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 查看 Storage 策略
SELECT * FROM storage.policies;
```

---

## 策略说明

### 数据库表 RLS 策略

| 表名 | 策略 | 说明 |
|------|------|------|
| `user_quotas` | Users can view/insert/update own quota | 用户只能访问自己的配额记录 |
| `generation_sessions` | Users can view/create/update own sessions | 用户只能访问自己的生成会话 |
| `generated_images` | Users can view/insert own generated images | 用户只能访问自己会话下的图片 |
| `uploaded_files` | Users can view/insert/delete own uploaded files | 用户只能管理自己上传的文件 |

### Storage RLS 策略

| Bucket | 策略 | 说明 |
|--------|------|------|
| `user-uploads` | Users can upload/view/delete own files | 用户只能访问自己文件夹下的文件 (`userId/filename`) |
| `generated-headshots` | Users can upload/view own + Public can view | 用户可上传,所有人可查看(用于分享) |

---

## 下一步优化建议

### 1. 增加文件大小限制

在 `uploadService.ts` 中添加客户端验证:

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (file.size > MAX_FILE_SIZE) {
  throw new Error('文件大小不能超过 10MB');
}
```

### 2. 添加文件类型白名单

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('仅支持 JPG, PNG, WEBP, HEIC 格式');
}
```

### 3. 定期清理过期文件

创建 Supabase Edge Function 定期删除超过 30 天的文件:

```sql
-- 清理 30 天前的上传文件
DELETE FROM uploaded_files
WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## 技术支持

如果仍有问题,请检查:

1. **浏览器控制台**: 查看详细错误信息
2. **Supabase Logs**: Dashboard > Logs > 查看 API 请求日志
3. **Network 面板**: 检查请求的 Headers 和 Response

或提供错误截图到项目 Issues。
