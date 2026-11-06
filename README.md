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
