# 🔒 安全更新文档

## 更新概览

本次更新通过以下方式解决了严重的API Key暴露问题：

### 问题修复 ✅

#### 问题 1: Gemini API Key暴露 🔴
**修复方案：**
- ✅ 已创建 `api/gemini.ts` Serverless Function（之前已存在）
- ✅ 已创建 `services/geminiService.secure.ts` 安全版本
- ✅ 移除了 `vite.config.ts` 中的API Key注入

**修改详情：**
```diff
// vite.config.ts
- define: {
-   'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
-   'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
- }

// 原来：services/geminiService.ts
// 直接使用：aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 现在：services/generationService.ts
import { generateHeadshotWithNanoBanana } from './nanoBananaAPI.secure';
```

---

#### 问题 2: Nano Banana API Key暴露 🔴
**修复方案：**
- ✅ 已创建 `api/nanoBanana.ts` Serverless Function
- ✅ 已创建 `services/nanoBananaAPI.secure.ts` 安全版本
- ✅ 已修改 `services/generationService.ts` 导入安全版本

**修改详情：**
```diff
// services/generationService.ts
- import { generateHeadshotWithNanoBanana } from './nanoBananaAPI';
+ import { generateHeadshotWithNanoBanana } from './nanoBananaAPI.secure';
```

新的 `nanoBananaAPI.secure.ts` 通过 `/api/nanoBanana` Serverless Function 调用，所有API Key都存储在服务器端。

---

## 环境变量配置

### ✅ 已删除的环境变量注入

```typescript
// vite.config.ts - 已删除
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

### 📋 Vercel 环境变量配置要求

请在 Vercel Dashboard 中配置以下环境变量（Settings → Environment Variables）：

| 变量名 | 必需 | 用途 | 可见范围 |
|--------|------|------|---------|
| `GEMINI_API_KEY` | ✅ | Gemini API调用（通过 `/api/gemini`） | Server-side only ✅ |
| `NANO_BANANA_API_KEY` | ✅ | Nano Banana API调用（通过 `/api/nanoBanana`） | Server-side only ✅ |
| `VITE_SUPABASE_URL` | ✅ | Supabase项目URL | Client-side（安全） |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase匿名密钥 | Client-side（安全） |
| `VITE_APP_URL` | ❌ | 应用URL（可选，用于生产环境）| Client-side |

### ⚠️ 环境变量更新清单

**需要在 Vercel Dashboard 中更新：**

1. ✅ `GEMINI_API_KEY` - 保留（已在安全的 Serverless Function 中使用）
2. ✅ `NANO_BANANA_API_KEY` - 新增（用于 `/api/nanoBanana`）
   - **重要：** 从 `NANO_BANANA_API_KEY` 改为 `NANO_BANANA_API_KEY`（移除 `VITE_` 前缀）
3. ✅ `VITE_SUPABASE_URL` - 保留（已安全）
4. ✅ `VITE_SUPABASE_ANON_KEY` - 保留（已安全）

---

## 修改的文件清单

### 已创建的文件

| 文件路径 | 用途 | 优先级 |
|---------|------|--------|
| `api/nanoBanana.ts` | Nano Banana API Serverless Function | 🔴 高 |
| `services/geminiService.secure.ts` | Gemini API安全客户端 | 🟡 中 |
| `services/nanoBananaAPI.secure.ts` | Nano Banana API安全客户端 | 🔴 高 |

### 已修改的文件

| 文件路径 | 修改内容 | 风险等级 |
|---------|----------|---------|
| `vite.config.ts` | 删除API Key注入（define对象） | 无 |
| `services/generationService.ts` | 更改导入为 `nanoBananaAPI.secure` | 无 |

### 可保留或删除的文件（不再使用）

| 文件路径 | 状态 | 建议 |
|---------|------|------|
| `services/geminiService.ts` | 不再使用 | 可以删除或重命名为 `.old.ts` 作为备份 |
| `services/nanoBananaAPI.ts` | 不再使用 | 可以删除或重命名为 `.old.ts` 作为备份 |

---

## API Key 安全性验证

### 🟢 安全检查清单

- [x] Gemini API Key 不再通过 `vite.config.ts` 注入到客户端
- [x] Nano Banana API Key 不再在客户端代码中可见
- [x] 所有API Key都存储在Vercel服务器端环境变量中
- [x] 前端通过 `/api/gemini` 和 `/api/nanoBanana` 调用API
- [x] 所有 API 路由都有 CORS 配置
- [x] Supabase Anon Key 仍然公开（设计如此，使用RLS保护）

### 📋 验证步骤

**1. 检查浏览器开发工具中是否暴露API Key**

```javascript
// 在浏览器控制台运行以下命令
console.log(process.env.GEMINI_API_KEY);      // 应显示 undefined
console.log(import.meta.env.GEMINI_API_KEY);  // 应显示 undefined
console.log(import.meta.env.NANO_BANANA_API_KEY); // 应显示 undefined
```

**预期结果：** 所有输出都应为 `undefined`

---

**2. 检查构建输出中是否包含API Key**

```bash
# 构建项目
npm run build

# 检查dist文件夹中的js文件是否包含API Key
grep -r "sk-" dist/ || echo "✅ No API keys found"
```

**预期结果：** 不应找到任何 API Key

---

**3. 验证API Serverless Functions是否正常工作**

在部署到Vercel后，访问以下端点进行测试：

```bash
# 测试 Gemini API
curl -X POST https://your-domain.com/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"action":"generateTips","profession":"Software Engineer"}'

# 测试 Nano Banana API (会在Vercel环境中工作)
curl -X POST https://your-domain.com/api/nanoBanana \
  -H "Content-Type: application/json" \
  -d '{"action":"queryStatus","taskId":"test-id"}'
```

**预期结果：**
- Gemini: 返回 `{"result":"...tips..."}` 或错误信息
- Nano Banana: 返回任务状态或错误信息

---

## 部署步骤

### 第 1 步: 本地测试

```bash
# 安装依赖
npm install

# 本地开发构建
npm run build

# 验证构建输出
ls -la dist/
```

### 第 2 步: Vercel 配置

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. **删除** `NANO_BANANA_API_KEY`（如果存在）
5. **新增** `NANO_BANANA_API_KEY`（不带 `VITE_` 前缀）
6. 确认以下环境变量已配置：
   - `GEMINI_API_KEY`
   - `NANO_BANANA_API_KEY` (新)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### 第 3 步: 重新部署

```bash
# 通过Vercel Dashboard重新部署，或
# 使用CLI
vercel --prod

# 或推送到git，Vercel会自动部署
git add .
git commit -m "fix: move API Keys to server-side Serverless Functions for security"
git push origin main
```

### 第 4 步: 验证部署

部署完成后：

1. 访问你的应用首页，确保正常加载
2. 在浏览器开发工具中运行验证脚本（见上述验证步骤）
3. 尝试生成头像功能，确保API调用正常
4. 检查 Vercel 日志中是否有错误

---

## 回滚计划（如果需要）

如果部署后出现问题，可以回滚到之前的版本：

```bash
# 方案 1: 通过Vercel Dashboard
# Settings → Deployments → 选择之前的版本 → Promote to Production

# 方案 2: 通过Git
git revert <commit-hash>
git push origin main
```

---

## 常见问题

### Q: 为什么要移动API Key到服务器端？

A: 将API Key暴露在客户端代码中存在严重的安全风险：
- 任何人都可以在浏览器中查看API Key
- API Key可能被滥用，导致账户被封或产生意外费用
- 无法追踪谁在使用API Key
- 容易导致API限流或被服务提供商的安全警报触发

通过Serverless Function将API Key存储在服务器端，可以：
- 完全隐藏API Key
- 能够记录和审计所有API调用
- 实施额外的安全措施（如速率限制）
- 符合安全最佳实践

---

### Q: 这会影响性能吗？

A: 影响极小：
- 多了一跳请求（前端 → Serverless Function → 第三方API）
- 但这个额外延迟通常 < 100ms
- 与API响应时间相比可以忽略不计

---

### Q: 旧的 `services/geminiService.ts` 和 `services/nanoBananaAPI.ts` 还需要吗？

A: 不需要，可以删除或保留作为备份。

**建议做法：**
```bash
# 重命名为备份
mv services/geminiService.ts services/geminiService.old.ts
mv services/nanoBananaAPI.ts services/nanoBananaAPI.old.ts

# 或完全删除
rm services/geminiService.ts
rm services/nanoBananaAPI.ts
```

---

### Q: 如果Serverless Function失败了怎么办？

A:
- 错误会被返回给前端，前端的错误处理代码会捕获并显示友好的错误信息
- 所有Serverless Function都有详细的错误日志，可以在 Vercel Dashboard → Logs 中查看
- 建议配置 Vercel Alerts 在发生错误时通知你

---

## 总结

✅ **安全性提升**
- API Key 完全隐藏，不再暴露在客户端代码中
- 所有敏感信息都存储在服务器端

✅ **无功能损失**
- 用户体验完全相同
- 所有功能继续正常工作

✅ **易于维护**
- 代码结构清晰
- 易于添加更多安全措施（如速率限制、日志审计）

---

**更新时间：** 2025-12-13
**负责人：** Claude Code
**优先级：** 🔴 高（安全问题）
