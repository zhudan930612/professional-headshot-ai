# 🚀 部署检查清单

## 安全更新部署前检查

### ✅ 代码修改检查

- [x] `api/nanoBanana.ts` - 已创建 ✅
- [x] `services/geminiService.secure.ts` - 已创建 ✅
- [x] `services/nanoBananaAPI.secure.ts` - 已创建 ✅
- [x] `vite.config.ts` - 已移除API Key注入 ✅
- [x] `services/generationService.ts` - 已更新导入 ✅
- [x] 无其他文件导入旧的服务 ✅

### ✅ 本地构建测试

```bash
# 1. 安装依赖
npm install

# 2. 本地开发测试
npm run dev

# 3. 构建生产版本
npm run build

# 4. 验证构建输出大小
du -sh dist/

# 5. 检查是否包含API Key
grep -r "sk-\|GEMINI\|NANO_BANANA" dist/ && echo "⚠️ WARNING: API Keys found in build!" || echo "✅ No API Keys in build"
```

---

## Vercel 部署步骤

### 第 1 步: 环境变量配置

**登录 Vercel Dashboard → 选择项目 → Settings → Environment Variables**

#### ✅ 必须配置的变量

| 变量名 | 值 | 环境 | 说明 |
|--------|-------|------|------|
| `GEMINI_API_KEY` | [your-key] | Production, Preview, Development | Google Gemini API Key |
| `NANO_BANANA_API_KEY` | [your-key] | Production, Preview, Development | Nano Banana Pro API Key (新) |
| `VITE_SUPABASE_URL` | [your-url] | Production, Preview, Development | Supabase项目URL |
| `VITE_SUPABASE_ANON_KEY` | [your-key] | Production, Preview, Development | Supabase匿名密钥 |

#### ⚠️ 需要删除的变量

- `NANO_BANANA_API_KEY` (如果存在)
  - 原因：使用VITE_前缀会导致暴露到客户端
  - 替换为：`NANO_BANANA_API_KEY` (无VITE_前缀)

#### ⚠️ 需要验证的变量

确认以下变量已应用到所有环境：
- [ ] Production
- [ ] Preview
- [ ] Development

---

### 第 2 步: 重新部署

**选择以下任一方式：**

#### 方法 A: 通过 Vercel Dashboard
1. 进入项目 → Deployments
2. 点击最新的部署
3. 点击 "Redeploy" 或"Rebuild"

#### 方法 B: 通过 Git 推送
```bash
# 创建新提交并推送
git add .
git commit -m "fix: move API Keys to server-side Serverless Functions for security"
git push origin main
```

#### 方法 C: 通过 Vercel CLI
```bash
# 安装CLI (如未安装)
npm i -g vercel

# 登录
vercel login

# 重新部署
vercel --prod
```

---

### 第 3 步: 部署验证

#### ✅ 部署状态检查

在 Vercel Dashboard 中验证：
- [ ] Build 完成（绿色勾号）
- [ ] 没有构建错误
- [ ] Function 部分显示 `/api/gemini` ✅
- [ ] Function 部分显示 `/api/nanoBanana` ✅

#### ✅ 功能验证

访问 https://your-domain.com 并测试：

1. **页面加载** - 应该正常加载
   - [ ] 首页加载无错误
   - [ ] 所有资源都加载成功

2. **浏览器安全检查**
   ```javascript
   // 在浏览器控制台运行
   console.log(process.env.GEMINI_API_KEY);        // 应显示 undefined
   console.log(process.env.NANO_BANANA_API_KEY);   // 应显示 undefined
   console.log(import.meta.env.GEMINI_API_KEY);    // 应显示 undefined
   ```
   - [ ] 所有输出都是 `undefined`

3. **API 调用测试**
   - [ ] 尝试生成头像（点击"Generate"按钮）
   - [ ] 确认API调用成功（检查Network标签）
   - [ ] 网络请求应该发往 `/api/nanoBanana`，而不是第三方API

4. **错误处理验证**
   - [ ] 故意输入无效参数，确认返回友好的错误消息

---

## 部署后监控

### ✅ Vercel 日志检查

```
Dashboard → Project → Functions → Logs
```

监控以下内容：
- [ ] 没有 API Key 相关的错误日志
- [ ] `/api/gemini` 调用正常
- [ ] `/api/nanoBanana` 调用正常

### ✅ 错误监控（如已配置 Sentry/LogRocket）

- [ ] 检查是否有新的错误报告
- [ ] API 调用相关的错误是否合理（不应该是401/403 unauthorized)

### ✅ 性能监控

在 Vercel Dashboard 中查看：
- [ ] Function 执行时间正常
- [ ] 没有超时错误

---

## 回滚计划

如果部署后遇到问题，可以按以下步骤回滚：

### 方案 1: Vercel Dashboard 回滚

1. 进入项目 → Deployments
2. 找到上一个稳定版本
3. 点击版本
4. 点击 "Promote to Production"

**估计时间：** 1-2 分钟

### 方案 2: Git 回滚

```bash
# 查看提交历史
git log --oneline | head -10

# 回滚到之前的提交
git revert <commit-hash>
git push origin main

# Vercel 会自动部署新的提交
```

**估计时间：** 2-5 分钟

---

## 故障排除

### 问题 1: 403 Forbidden 错误

**症状：** 生成头像时收到 403 错误

**诊断步骤：**
1. 检查 Vercel Dashboard 环境变量是否正确配置
2. 在 Functions → Logs 中查看具体错误信息
3. 验证 API Key 是否有效且未过期

**解决方案：**
1. 更新 API Key
2. 重新部署

---

### 问题 2: 找不到 API 端点

**症状：** 404 错误，找不到 `/api/nanoBanana` 或 `/api/gemini`

**诊断步骤：**
1. 检查文件是否存在
   ```bash
   ls -la api/
   ```
2. 检查 Vercel 构建日志

**解决方案：**
1. 确保 `api/nanoBanana.ts` 和 `api/gemini.ts` 存在
2. 清除 Vercel 缓存并重新构建

---

### 问题 3: 构建失败

**症状：** Vercel 构建失败，显示编译错误

**诊断步骤：**
1. 查看 Vercel 构建日志中的错误信息
2. 在本地运行 `npm run build` 验证问题

**解决方案：**
1. 修复本地构建问题
2. 提交更新
3. Vercel 会自动重新部署

---

## 部署完成检查表

部署完成后，确认以下事项：

### 🔒 安全性

- [ ] API Key 在浏览器控制台中不可见
- [ ] API Key 不在构建输出中
- [ ] 所有 API 调用都通过 Serverless Functions 进行

### ✅ 功能

- [ ] 应用正常加载
- [ ] 所有页面可以访问
- [ ] 生成头像功能正常
- [ ] 历史记录功能正常
- [ ] 用户认证流程正常

### 📊 性能

- [ ] 页面加载速度正常
- [ ] API 响应时间正常
- [ ] 没有超时错误

### 📝 文档

- [ ] 已创建 `SECURITY_UPDATE.md`
- [ ] 已创建 `DEPLOYMENT_CHECKLIST.md`
- [ ] 已更新部署文档（如有）

---

## 提交消息建议

```bash
git commit -m "fix: secure API Keys by moving to server-side Serverless Functions

- Create /api/nanoBanana.ts Serverless Function
- Create services/geminiService.secure.ts and nanoBananaAPI.secure.ts
- Remove API Key injection from vite.config.ts
- Update generationService.ts to use secure versions
- Add SECURITY_UPDATE.md documentation

Fixes: API Key exposure vulnerability (Critical)
Related to: API security audit findings
"
```

---

## 常见问题

### Q: 需要多长时间才能看到效果？

A: Vercel 部署通常需要 1-3 分钟。部署完成后立即生效。

---

### Q: 如果我不小心暴露了 API Key 怎么办？

A:
1. 立即在相应服务的 Dashboard 中重新生成 API Key
2. 更新 Vercel 环境变量
3. 重新部署

---

### Q: 是否需要更新其他文件？

A: 不需要。所有必要的文件都已修改。旧的 `services/geminiService.ts` 和 `services/nanoBananaAPI.ts` 可以删除或保留。

---

## 联系支持

如果部署过程中遇到问题：

1. **Vercel 支持：** https://vercel.com/support
2. **API 文档：**
   - Gemini: https://ai.google.dev/docs
   - Nano Banana: https://api.evolink.ai/v1
   - Supabase: https://supabase.com/docs

---

**更新时间：** 2025-12-13
**优先级：** 🔴 高（安全更新）
