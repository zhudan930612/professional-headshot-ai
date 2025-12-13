# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CLAUDE 项目工作规范
- 默认用 **简体中文** 交流和解释代码。
- 回答结构清晰,分层、有标题、有要点列表。
- 代码必须放在 ```代码块``` 中,并在下方附中文解释。
- 若内容较复杂,先给出简短总结,再展开细节。
- 如我未要求,不输出多余寒暄,专注技术与需求本身。
- 将生成的计划文件.md放到当前项目文件夹。
- 使用 Next.js + shadcn/ui + Tailwind 风格编写组件。
- 组件必须基于现有封装,不能新建完全不相关的样式体系。

## 项目概述

这是一个专业头像 AI 生成应用,使用 React + TypeScript + Vite 构建,集成 Google Gemini AI API 用于生成专业头像建议和内容。

**技术栈:**
- React 19.2.1 + TypeScript 5.8
- Vite 6.2 (构建工具)
- React Router DOM 7.10 (路由)
- Tailwind CSS (通过 CDN 加载)
- Google Gemini AI (@google/genai)
- Lucide React (图标库)

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器 (端口 3000)
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 环境配置

- 需要在 `.env.local` 文件中设置 `GEMINI_API_KEY`
- Vite 配置会自动将环境变量注入到 `process.env.API_KEY` 和 `process.env.GEMINI_API_KEY`
- 开发服务器默认监听 `0.0.0.0:3000`

## 项目架构

### 目录结构

```
professional-headshot-ai/
├── components/          # React 组件
│   ├── AuthModal.tsx   # 认证模态框
│   ├── HeroTool.tsx    # 主工具组件 (上传、选择模板、生成)
│   └── Layout.tsx      # 布局组件 (导航栏、页脚)
├── pages/              # 路由页面
│   ├── Home.tsx        # 首页
│   ├── History.tsx     # 历史记录页
│   ├── FAQ.tsx         # 常见问题页
│   ├── Blog.tsx        # 博客列表页
│   ├── BlogPost.tsx    # 博客详情页
│   └── Terms.tsx       # 条款和隐私页
├── services/           # 服务层
│   ├── geminiService.ts    # Gemini AI 集成
│   └── storageService.ts   # LocalStorage 操作 (配额、历史)
├── types.ts            # TypeScript 类型定义
├── constants.ts        # 常量配置 (模板、FAQ、博客)
├── App.tsx             # 应用根组件 (路由配置)
└── index.tsx           # 应用入口
```

### 核心概念

**路由系统:**
- 使用 `HashRouter` (非 BrowserRouter)
- 所有路由定义在 `App.tsx` 中
- 包含自定义 `ScrollToTop` 组件确保路由切换时滚动到顶部

**样式系统:**
- 使用 Tailwind CSS (通过 CDN 加载,配置在 `index.html` 中)
- 自定义主题颜色为蓝色系 (`primary.500: #3b82f6`)
- 使用 Inter 字体 (Google Fonts)
- 包含自定义跑马灯动画 (`animate-marquee`)

**状态管理:**
- 使用 React Hooks (无 Redux/Zustand)
- LocalStorage 用于持久化:
  - `ai_headshot_history`: 生成历史记录
  - `ai_headshot_quota`: 每日配额 (限制 100 次/天)

**AI 集成 (geminiService.ts):**
- `generateHeadshotTips(profession)`: 为指定职业生成头像建议
- `generatePlaceholderImageDescription()`: 生成占位图描述
- 使用 Gemini 2.5 Flash 模型
- API Key 通过 `process.env.API_KEY` 获取

**图片生成流程 (HeroTool.tsx):**
1. 步骤 1: 上传 3-10 张自拍照
2. 步骤 2: 选择头像风格 (General/Medical/RealEstate/Corporate/Creative)
3. 步骤 3: 选择多个模板并生成头像
- 当前使用 `mockGenerateImages()` 模拟生成 (返回 picsum.photos 占位图)
- 支持下载和重新生成功能

**类型系统 (types.ts):**
- `HeadshotStyle`: 头像风格枚举 (5种)
- `UseCase`: 使用场景枚举 (LinkedIn/Resume/Portfolio/SocialMedia)
- `GeneratedImage`: 生成的图片数据结构
- `GenerationSession`: 生成会话记录
- `UserQuota`: 用户配额数据结构

**配额管理 (storageService.ts):**
- 每日限制 100 次生成 (DAILY_LIMIT 常量)
- 配额每天午夜 UTC 重置
- `getQuota()`: 获取今日已使用配额
- `incrementQuota(amount)`: 增加配额并检查是否超限
- `getRemainingQuota()`: 获取剩余配额

## 路径别名配置

- `@/*` 映射到项目根目录
- 在 `vite.config.ts` 和 `tsconfig.json` 中配置
- 示例: `import { Layout } from '@/components/Layout'`

## 关键注意事项

**模板系统:**
- `constants.ts` 中定义了 15 个基础模板
- 通过循环复制生成 45+ 个模板以支持滚动展示
- 模板使用 Unsplash 图片作为预览

**多选模板功能:**
- 用户可选择多个模板同时生成
- 每个模板生成独立的结果
- 结果展示在网格布局中,支持下载和重新生成单个结果

**图片处理:**
- 支持拖放上传和点击上传
- 最多 10 张照片,最小 3 张
- 文件预览使用 `URL.createObjectURL()`
- 记得使用 `URL.revokeObjectURL()` 清理内存

**博客系统:**
- 博客文章数据定义在 `constants.ts` 的 `BLOG_POSTS` 中
- 路由为 `/blog/:slug`（使用 SEO 友好的 slug，如 `/blog/top-5-mistakes-in-resume-photos`）
- 当前为静态内容,可扩展为使用 Gemini 生成动态内容

## 部署相关

- 构建输出到 `dist/` 目录
- 使用 Hash 路由以支持静态托管
- 需要在生产环境中设置 `GEMINI_API_KEY` 环境变量

### Vercel 部署

**支持程度:** ✅ 完全支持

- 已配置 `vercel.json` 文件
- Vercel 自动检测 Vite 项目
- 零配置即可部署

**安全建议:**
- 当前版本在前端直接调用 Gemini API,会暴露 API Key
- 生产环境建议使用 `api/gemini.ts` Serverless Function
- 替换 `services/geminiService.ts` 为 `services/geminiService.secure.ts`
- 详见 `DEPLOYMENT.md` 文档

**部署文件:**
- `vercel.json`: Vercel 配置
- `api/gemini.ts`: Serverless Function (可选,用于保护 API Key)
- `services/geminiService.secure.ts`: 安全版本服务 (使用 Serverless Function)
