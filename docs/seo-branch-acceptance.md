# SEO 分支综合验收记录

2026-11-06。本轮SEO功能版本 `55100df4dc59e6443c6f5651180494cddb019e5c` 已合入main并发布。Cloudflare生产部署 `ba344843-340d-49c1-90a0-556e5e2e4c8b` 于15:47:45（Asia/Taipei）成功，GitHub部署检查为success。综合技术回归及正式域名验证通过，未发现所测范围内的新阻断问题；Google索引恢复仍须后续独立核验。

## 本轮改动与验收结果

| 范围 | 本地结果 |
|---|---|
| 15 个公开页面预渲染 | 初始 HTML 有正文、唯一 H1、独立标题/描述、自身 canonical；页面与 sitemap 一致，从首页最多两次链接点击可达 |
| 真实 404 与私有路由 | 5 类缺失页面 GET/HEAD 为 404；6 个私有路径保留原地址返回 app-shell、无重定向，带 noindex |
| LinkedIn 用途页 | 桌面/手机可访问，示例切换正常；登录返回位置及生成界面由模拟接口测试覆盖 |
| 博客列表与 8 篇详情 | 封面、两条相关文章、文字面包屑、目录锚点正确；Read guide 与目录首项一致；页脚与首页相同 |
| 封面预览 | 解码后以 380ms 淡入，快速划过和过期加载取消有回归覆盖 |
| 图片与分享资源 | 80 个响应式 WebP、原 JPEG 候选及 11 张分享 PNG 校验通过；153 个同源链接/资源地址 HTTP 200，未发现失效页内锚点 |
| 结构化数据 | 首页仅 WebSite；8 篇文章各有 BlogPosting/BreadcrumbList；初始 HTML 与接管一致，切页/加载中/账号/404 无旧数据残留 |
| 页面运行 | 15 页 × 1440/390 两种宽度共 30 次浏览器检查通过：一个 H1、正确 canonical、无横向溢出、无可见本地坏图或未捕获 JS 异常 |
| 构建与依赖 | 冻结锁文件安装、TypeScript、116 项回归、45 项接管/交互、构建、产物检查、密钥扫描、依赖审计通过；0 已知依赖漏洞 |

浏览器批量检查屏蔽外部 HTTPS 请求，隔离字体、统计和第三方集成的干扰；它验证本地应用，不替代第三方服务验收。首页、LinkedIn、博客列表、简历照片文章的桌面/手机截图已目视检查。关键交互另行复测，LinkedIn 选中态与当前图片一致，滚动后 12 张可见图库图像完成加载。

## 性能与运行边界

本分支未修改 Cloudflare Worker、D1/R2 配置或 API 路由规则。构建 Worker SHA-256 保持 `412351b653aa852d0022bc096272febfb4de213f5084794465f0dc983cfdedcb`，没有请求时页面渲染、图片转换或新增 D1 查询。公开 HTML gzip 约 4.8–11.8KB；首页 WebSite 增加 262 字节 HTML，结构化数据共用 JS 块约 0.24KB gzip。

图片优化阶段的同条件本地测量：桌面首页图片传输约 1728→388KB，手机 1728→207KB；博客列表约 358→167KB、467→126KB。该实验屏蔽外部资源、每页冷缓存观察 12 秒，属于实验室数据；本次综合回归未重复计时，也未测得真实访客 Core Web Vitals。不得据此宣称线上 LCP/排名已提升。

## 正式域名验证

`https://www.professionalheadshotai.ink` 的15页正文/标题/canonical、分享PNG/响应式图片、WebSite和8篇文章标记均通过HTTP检查；6个私有路由和5类真实404正常。线上sitemap含15页、robots引用正确，裸域301跳转到www。检查的4个入口JS/CSS资源均200且类型正确。

`pnpm check:cloudflare` 通过健康、匿名会话、套餐、账号/支付状态/私图鉴权、未知API404、模板图片及真实Google登录挑战初始化。4个页面在1440/390宽度共8次生产浏览器检查通过，无横向溢出、可见本地坏图、未捕获异常或hydration错误；统计请求因QA而屏蔽。本轮没有进行真实Google账号登录、非零实付或付费生图，旧业务验收见 [生产验收记录](production-acceptance.md)。

云端完整 `pnpm verify` 成功，首次生成80张响应式图，预渲染15页，产物共283文件；Worker哈希与本地相同。后续上线记录提交只修改文档，应用功能版本仍为55100df。

## 仍待后续验证

1. 已完成下方Search Console首轮只读核对和sitemap重新提交；Google报告的抓取记录尚早于本次发布。两页单独请求编入索引由用户接手，成功结果尚未确认；后续观察实际索引、展示和点击变化。
2. 验证真实社交平台的分享卡片及缓存。图片与标签已在线可访问，但平台缓存尚未实测。WebSite不受Google Rich Results Test支持；最终搜索名称由Google决定。
3. 收集线上真实访客性能数据；没有足够样本时标记数据不足，不把本地实验当作生产CWV。

## 发布后 Search Console 首轮核对

2026-11-06 15:59（Asia/Taipei），GSC Wizard `list_sitemaps`、`inspect_url` 返回：

| 页面 | Google索引状态 | 最近抓取（Asia/Taipei） |
|---|---|---|
| 首页 `/` | Submitted and indexed | 2026-11-06 05:18:53 |
| `/blog/top-5-mistakes-in-resume-photos` | Crawled - currently not indexed | 2026-08-20 18:56:51 |
| `/linkedin-headshots` | URL is unknown to Google | 无记录 |

首页与简历文章的robots/indexing均允许、抓取成功，Google与用户canonical均为各自网址。LinkedIn的抓取/robots/索引许可状态为未提供，不可解释为被robots屏蔽。`list_url_inspections` 历史显示首页与简历文章的状态及抓取时间和发布前检查相同；本次检查调用读取Google索引记录，不会实时触发抓取。

`https://www.professionalheadshotai.ink/sitemap.xml` 的Search Console记录：最后提交2026-01-14 22:47:26、最后下载22:47:27，isPending=false，warnings=0、errors=0，submitted=14。现场HTTP检查为200、15个网址，并包含本次3个目标。Google记录尚未反映本次新sitemap；最后下载时间不能据以断言此后从未抓取任何页面，submitted也不是已收录数量。

本次线上HTTP同时确认3页均200、canonical指向自身、无meta/header noindex、初始HTML含正文及H1。技术版本已上线，但Google尚无发布后的抓取记录可用于评价修复效果。检查前配额1,986/2,000，本次使用3次；未配置索引跟踪器，未新建任务、提交sitemap或请求编入索引。证据为 `.recovery/gsc-post-release-inspections.json` 和 `.recovery/gsc-post-release-live.json`。

## Sitemap 提交与人工索引请求交接

2026-11-06 16:05:27（Asia/Taipei），`submit_sitemap` 返回：现有sitemap提交1项、成功1项、失败0项，accepted=true、confirmed=true、isPending=true。Google已接受重新下载请求；返回的错误/警告均为0，但仍需下载后核对解析结果，不能据此宣称已收录。

简历照片常见错误文章及LinkedIn用途页的单独索引请求未由代理提交。内置浏览器读取超时，Windows Computer Use又因无法可靠确定浏览器当前URL而停止；用户已选择自行操作并收到步骤，尚未明确确认两页均出现“已请求编入索引”。当前不得把这两项记为提交成功。

## 保留事项与当前状态

- **内容审核另行处理**：用户已跳过宣传文案/套餐权益一致性，博客中的量化效果、年份和事实依据尚未完成内容验收。本次技术通过不代表这些表述已经核实。
- **已有风格提示保留**：此前全页设计检查仍有页脚阴影/分隔线/渐变、文章少图片、窄屏长标题等 5 类 FAIL/5 类 WARN；按用户要求保留统一页脚及现有正文，本轮没有扩大改版。30 次技术布局检查通过不等于全页风格评分为零警告。
- **提交范围**：原先6个SEO提交和首页WebSite已一起发布。此前隔离的支付文档记录、后续Search Console结果和竞品调研记录，本次均已获用户明确的本地提交授权；没有新增推送或发布授权。
- **发布已完成**：沿用既有Cloudflare Git自动发布，未修改数据库、支付配置或原私有资源。发布使用仓库外独立main工作区，原工作区保持功能分支及原有文档改动。
- **文档与规则已对齐**：README 增加本记录入口，AGENTS 命令表修正历史 auth 检查说明；历史迁移资料保留历史标识。长期记忆和其他项目为 out-of-scope，未改动。
- **复核现场保留**：隔离 Pages 预览 `http://127.0.0.1:4173` 继续可用；没有删除分支、worktree、验收证据或其他会话资料。

## 复现与证据

主要命令：`pnpm install --frozen-lockfile --ignore-scripts`、`pnpm verify`、`pnpm check:prerender http://127.0.0.1:4173`。本地 Pages 使用仓库外隔离配置；不要在仓库子目录启动而误加载正式 `.dev.vars`。

完整日志与截图均为忽略的本地验收资料：`.recovery/seo-final-verify.log`、`seo-final-http.log`、`seo-final-install.log`、`seo-final-assets.json`、`seo-final-interactions.log`、`seo-final-browser/report.json` 及同目录截图。浏览器/资源检查脚本为 `.recovery/seo-final-browser.mjs`、`.recovery/seo-final-assets.mjs`。固定等待可能早于页面接管：本轮一次旧交互脚本误报示例未切换，改为等待页面和图像完成、使用原生点击并核对选中态后通过，业务代码未因该误报修改。

生产验证命令：`pnpm check:prerender https://www.professionalheadshotai.ink`、`pnpm check:cloudflare`。证据：`.recovery/seo-live-pages.log`、`seo-live-runtime.log`、`seo-live-resources.json`、`seo-live-browser/report.json` 及截图。
