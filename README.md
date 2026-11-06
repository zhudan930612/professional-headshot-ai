# Professional Headshot AI

React + TypeScript + Vite，Cloudflare Pages advanced-mode Worker + D1 + 私有 R2，Google 登录，Creem 单次购买额度。

先读 [HANDOFF.MD](HANDOFF.MD) 和 [迁移记录](docs/cloudflare-native-migration.md)。生产运行入口是 cloudflare/worker.ts，构建为 dist/_worker.js；旧 functions/、api/、server/ 中的 Supabase 实现和 PostgreSQL 测试保留用于历史对照，不参与当前生产 Worker。

## 本地运行

需要 Node.js 22+、pnpm 10.26.1。复制 .dev.vars.example 为 .dev.vars；填写 Google Client ID 和随机图片签名密钥。付费服务默认留空。

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec wrangler d1 migrations apply professional-headshot-ai --local
pnpm dev:full
```

本地地址 http://localhost:3000。D1/R2 默认使用本地模拟资源，不写生产库。Google 登录还需要对应 Client ID 允许 localhost 的 JavaScript Origin；正式网站使用原域名。

pnpm dev / pnpm preview 只提供前端，不能验证登录、支付和生图。修改后运行 pnpm build 会构建前端、15 个公开页面的静态 HTML 和 Worker。

## 公开页面预渲染

构建复用 React 页面与 public/content/blog 中的 Markdown。首页、LinkedIn 用途页、定价、FAQ、博客列表、8 篇文章、隐私和条款页面直接包含正文、独立标题、描述和 canonical；浏览器使用相同初始数据接管页面。私有页面仍使用独立 app-shell.html，静态页面由 Pages 提供，不增加 Worker 渲染或 D1 查询。

定价在构建时只读获取正式网站 `/api/plans`，校验并选取公开字段；请求失败或套餐不完整会使构建失败。**修改 D1 套餐后必须重新构建发布**，更新静态价格；浏览器打开价格页后仍会从 API 刷新。`PRERENDER_PLANS_URL` 可显式指定测试环境的公开接口（HTTPS 或本地 HTTP）；不接受凭据、查询参数，也不使用过期缓存或硬编码价格兜底。

预渲染路由与 sitemap 必须一致，否则构建失败。`dist-ssr/` 仅供构建使用，不部署。不要恢复 `/* /index.html 200`，该规则会覆盖新生成的页面。构建同时生成根目录 `404.html`，Pages 对不存在的普通页面、文章和静态资源返回真实 HTTP 404；页面带 noindex、不输出 canonical，并提供返回首页和博客的入口。SPA 内部跳转不发文档请求，显示相同错误页；直接访问或刷新时由 Pages 返回 404。

HTTP 验收使用 `pnpm check:prerender http://localhost:4173`，禁止自动跟随重定向，同时覆盖有效页面、私有路由、无效 URL 的 GET/HEAD 及 API JSON 状态。账户页和登录回调仍依靠 `_redirects` 的显式 200 重写，目标必须是无扩展名的 `/app-shell`。

构建后运行 `pnpm check:prerender` 验证 15 个 HTML（禁用脚本），`pnpm check:hydration` 验证这些产物由 React 接管及路由、登录、价格刷新和生图界面（接口模拟）。`pnpm check:prerender http://localhost:4173` 可核对本地 Pages 服务实际返回的页面。检查全部纳入 `pnpm verify`。浏览器 DOM 测试不能替代真实 Google 登录或付费生图验收。

`/linkedin-headshots` 复用现有 HeroTool：示例切换和圆形裁切仅用于预览，不冒充前后对比或自动发布到 LinkedIn。首页用途卡片、页脚和 LinkedIn 指南文章提供入口；匿名主按钮打开登录并保留带生成区锚点的返回路径。

## 检查

分享预览由 `lib/socialPreview.ts` 集中定义，初始 HTML 和客户端 SEOHead 复用同一组 Open Graph/Twitter 标签。首页、LinkedIn 和 8 篇文章使用独立分享图，其他公开页使用默认品牌图；博客为 article，其他页面为 website，私有/404 页面不携带分享图。

运行 `pnpm generate:social` 可用本地 Inter 字体和现有人像重新生成 `public/social/` 的 11 张 1200×630 PNG。仅开发脚本使用 resvg，不增加 Worker 渲染；正常构建校验尺寸、大小和源/产物哈希，不自动出图、不联网下载字体。修改标题或素材后须重新生成。图片在未发布时仅能在本地检查，真实平台展示及缓存应在最终发布后验证。

博客封面、阅读标题、摘要和文末推荐集中在 `lib/blogPresentation.ts`：每篇两条固定关联及一个工具入口。`BlogCover` 使用现有 JPEG 人像的响应式 WebP 版本；列表采用图片索引，焦点/悬停切换预览，详情使用短阅读标题、目录与正文分区。旧 SVG 拼贴和生成脚本已撤下，备份在忽略目录 `.recovery/blog-svg-v1`。

`pnpm dev` 和 `pnpm build` 会先运行 `pnpm generate:images`，在 `public/optimized/` 生成 20 张营销人像的 192/384/640/768px WebP 版本，最高档复用 896px 原 JPEG（忽略生成目录，构建时打包）。源图、配置及产物哈希一致时复用缓存；丢失或损坏时重建。首页图库、LinkedIn 示例和博客使用 `srcset`/`sizes`，首屏主图保持优先加载，图库及正文外图片懒加载。原 JPEG 和分享图保留，用户上传、生成与下载图片不经过此转换；sharp 只参与开发和构建，不进入 Worker。

`lib/blogReading.ts` 在解析时移除装饰 emoji、重复提示标签和分隔线，保留后续段落与列表，并给二级标题生成稳定目录锚点。原 Markdown、文章 URL、发布日期和 SEO 标题保留；阅读标题及呈现单独配置，不代表已完成原文事实核验。博客专用布局和样式位于 `pages/blog.css`，不替换其他业务页面的版式。视觉记录及三宽截图在忽略目录 `.taste-skill/`。

构建会检查 JPEG 封面、关联文章及工具目标；静态检查和交互测试覆盖封面一致性、目录锚点、正文装饰清理、两条推荐及跳转后的 canonical。

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm check:prerender
pnpm check:hydration
pnpm audit
pnpm check:secrets
pnpm check:cloudflare
pnpm check:payments
```

check:cloudflare 检查正式域名的 API、套餐、私有照片鉴权、公开模板和真实登录初始化；会创建一个自动过期的 nonce，不创建用户、订单或额度。check:auth / check:recovery 也指向这套检查。check:payments 从 .env.local 读取正式 Creem 配置，只读核对当前网站套餐、产品及回调，不创建付款或退款。check:source / check:supabase 只用于旧源库排查，旧凭据已退役，不是当前上线门禁。

## 部署

```powershell
pnpm build
pnpm exec tsx scripts/cloudflare/verify-artifact.ts
pnpm exec wrangler pages deploy dist --project-name professional-headshot-ai --branch main --commit-dirty=true
pnpm check:cloudflare
```

普通变量必须声明在 wrangler.toml；Dashboard 单独配置的普通变量可能被部署覆盖。密钥用 Pages secrets 管理。当前生产已切换到 D1/R2，构建不含 Supabase 运行时引用。

Git 的遗留合并状态已解决，迁移代码已同步到 main。自动发布已重新启用，构建命令为 pnpm verify（类型、测试、构建、产物检查、密钥检查及依赖审计）；远端构建结果见 Cloudflare 部署记录。

## 数据和验证边界

原用户 ID、Google subject、订单及额度保留。私有照片需要本人会话或限定对象的短期签名 URL。原 Supabase 数据保留为备份，三个旧存储桶已取消公开访问；旧管理密钥请求已返回 401，旧 HS256 签名密钥已撤销。Git 历史未改写。

数据库、文件哈希、Google 真实登录和支付回调签名检查已完成。1K/2K 实际出图、扣额度、保存、下载和历史读取已通过独立账号验收；Professional 和 Executive 均完成 Creem Test Mode 付款、实际商户回调入账及全额退款，未进行正式现金扣款。见 [生产验收记录](docs/production-acceptance.md)。旧占位图记录保留并标识，不作为真实照片显示。
