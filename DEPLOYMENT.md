# Vercel 部署指南

## 快速部署 (不安全版本 - 仅用于测试)

1. 将项目推送到 Git 仓库 (GitHub/GitLab/Bitbucket)
2. 访问 [vercel.com](https://vercel.com) 并导入项目
3. 添加环境变量 `GEMINI_API_KEY`
4. 点击 Deploy

**⚠️ 警告:** 此方式会在前端暴露 API Key,任何人都可以在浏览器中看到并滥用。

## 安全部署 (推荐用于生产)

### 步骤 1: 安装 Vercel 依赖

```bash
npm install --save-dev @vercel/node
```

### 步骤 2: 启用安全版本的服务

```bash
# 备份原文件
mv services/geminiService.ts services/geminiService.old.ts

# 使用安全版本
mv services/geminiService.secure.ts services/geminiService.ts
```

### 步骤 3: 部署到 Vercel

**通过 Dashboard:**
1. 在 Vercel Dashboard 导入项目
2. 在 Settings → Environment Variables 添加:
   - `GEMINI_API_KEY`: 你的 API Key
3. 部署项目

**通过 CLI:**
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod

# 添加环境变量
vercel env add GEMINI_API_KEY
```

### 步骤 4: 验证部署

访问你的 Vercel 部署 URL,测试以下功能:
- [ ] 首页正常加载
- [ ] 上传照片功能正常
- [ ] AI 建议功能正常 (需要 API Key)
- [ ] 生成头像功能正常
- [ ] 历史记录保存正常

## 架构对比

### 不安全版本 (当前)
```
浏览器 → 直接调用 Gemini API (API Key 暴露)
```

### 安全版本 (推荐)
```
浏览器 → Vercel Serverless Function → Gemini API (API Key 在服务器端)
```

## 环境变量说明

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `GEMINI_API_KEY` | 是 | Google Gemini API 密钥 |

## 自定义域名 (可选)

1. 在 Vercel Dashboard 进入项目设置
2. 选择 Domains 标签
3. 添加你的域名并按提示配置 DNS

## 常见问题

**Q: 为什么使用 HashRouter?**
A: HashRouter 不需要服务器端路由配置,更适合静态托管。

**Q: 如何查看构建日志?**
A: 在 Vercel Dashboard 的 Deployments 页面查看每次部署的详细日志。

**Q: API Key 会被滥用吗?**
A: 使用安全版本 (Serverless Function) 可以避免 API Key 暴露。

**Q: 可以回滚到之前的版本吗?**
A: 可以,在 Deployments 页面选择任意历史版本点击 "Promote to Production"。

## 监控和调试

- **日志:** Vercel Dashboard → Project → Logs
- **分析:** Vercel Dashboard → Project → Analytics
- **性能:** Vercel Dashboard → Project → Speed Insights

## 成本说明

- Vercel Hobby 计划:免费,包含:
  - 100 GB 带宽/月
  - 100 GB-hours Serverless Function 执行时间
  - 自动 HTTPS
  - 自定义域名

- Gemini API: 按调用次数计费,查看 [Google AI Studio 定价](https://ai.google.dev/pricing)
